# Attention计算

[toc]

本文梳理**LLM推理**情况下Attention的计算。包括理论上的分析、实际部署时的改进方法（FlashAttention、FlashInfer、FlashDecoding++、SWA等）。包括不同的Attention（MHA、GHA、MLA、Lightning Attention），不同的批处理方案等。


Decode Attention和KV Cache是一对烂兄烂弟，它们以低ARI（计算密度）和高memory bound（需要的存储容量高，或者你有高内存带宽也可以）而闻名，而且经常在一起被讨论、被处理。鉴于LLM训练过程中没有什么KV Cache，只有推理过程的注意力计算有KV Cache，讨论KV Cache实质上就是在讨论Decode Attention，讨论LLM推理，就必然绕不开Decode Attention中的KV Cache。

在MLSys'25的FlexInfer中，提到基于offload的LLM推理，一个思路是把模型参数、激活值、KV Cache放到CPU内存，GPU需要时通过PCIe传输到GPU，尽管有多种优化方法，但是传输时延仍然是最大的瓶颈。

另一个思路是把一部分计算放到CPU上，他们注意到目前的CPU有着充足的存储空间，以及专用的GEMM计算硬件（Intel的AMX），可以把一部分计算放到CPU上。FlexInfer和llama.cpp的CPU-GPU异构计算的offload策略都是基于层的，例如在GPU上计算N层，然后把其他的层放到CPU上计算。

在MLSys'25的NEO中，它关注的是在显存受限GPU下低延迟的在线推理。它是将一部分请求的Decode Attention卸载到CPU上进行计算。它注意到只有decode attention的计算需要KV Cache，而且decode attention是低ARI的，把decode attention和KV Cache放到CPU上正好，免去了大量KV Cache换进换出的开销。NEO的offload策略是在层内的，它注意到投影、FFN都是计算密集的，适合放在GPU上进行，decode attention是低ARI且访存密集的，所以放到CPU上做。



## 注意力计算方法

### 单层、单头注意力计算

这里是最基础的，单层attention，一个head，一个batch的情况。

令$x_t=[x_1,x_2,...,x_d] \in R^{1*d}$，是输入在隐藏层的向量，d为隐藏层维度。

推理过程只需用到当前token的$Q_t=W_q*x_t \in R^{1*d}$，所以无需Q Cache。

有必要说明一下自回归推理过程，prompt输入后，经过chunk，embedding以及位置编码后，$X \in R^{\ t  \ * \ d\_model}$，这个时候就是正常注意力计算，输出一个矩阵$atten\_res \in R^{\ t \ * \ d\_model}$，将prompt的最后一个token对应的注意力结果，作为自回归生成的输入，询问的长度是1，键-值对的长度是历史文本的长度，通过历史文本输出下一个token。

$K_t=W_k*x_t$、$V_t=W_v*x_t \in R^{1*d}$，

$$
K = [K_1^T K_2^T ... K_t^T]^T \in R^{t*d} \\
V = [V_1^T V_2^T ... V_t^T]^T \in R^{t*d}
$$

K、V矩阵即是我们保存的KV Cache。

$$
O_t = softmax(\frac{Q_tK^T}{\sqrt{d_k}})V
$$

$O_t$就是输出向量。$\sqrt{d_k}$防止数值太大，在softmax指数计算里可能溢出。在Flash Attention里，没有除$\sqrt{d_k}$，而是在计算softmax时所有元素都减去最大值，同样可以保证数值稳定。

$$
Attention Score = softmax(\frac{Q_tK^T}{\sqrt{d_k}}) \in R^{1*t}
$$
表示当前token的Query和之前Cache的Key的匹配程度。也视为权重，之前的token在本次输出越重要，该token对应位置的Attention Score就越大。

Attention Score非常小时，该token在本次生成时影响也非常小。

### 单层、多头注意力计算（MHA）

多头注意力的本质是：并行将单头注意力计算多次。

输入还是$X \in R^{n*d\_model}$

同一个输入$X$，经过不同头的投影矩阵$WQ_i$、$WK_i$、$WV_i\ \in\R^{d\_model*d\_k}$，其中$i \in [0,h-1]$，$d\_k=d\_model/h$，

$$
Q_i = X * WQ_i \in R^{n*d_k}
$$
$K_i$、$V_i$也类似得到，每个头分别自己做单头注意力：

$$
head_i = Attention(Q_i,K_i,V_i) = softmax(\frac{Q_iK_i^T}{\sqrt{d_k}})V_i
$$

然后把所有的头拼接在一起：

$$
Concat(head_1,head_2,...,head_h)=[head_1:head_2:...:head_h]
$$

然后再经过一次投影变换：

$$
MultiHead = Concat(head_1,head_2,...,head_h)W^O
$$

### 单层、多批次的多头注意力实际计算流程

在实际计算的时候，会把所有头的投影矩阵拼接，充分并行计算：

输入：$X \in R^{ \ batch\_size \ * \ seq\_len \ * \ d\_model}$

投影矩阵：
$$
WQ = [WQ_1:WQ_2:...:WQ_h] \in R^{ \ d\_model \ * \ (h \ * \ d\_k)}
$$

Q、K、V矩阵：
$$
Q = X \ * \ WQ \in R^{ \ batch\_size \ * \ seq\_len \ * \ (h \ * \ d\_k)}
$$

把最后一个维度拆开：
$$
Q \in R^{ \ batch\_size \ * \ seq\_len \ * \ h \ * \  d\_k }
$$

转置，把h个头的维度放到前面去，也就是交换seq_len和h的两个维度：
$$
Q \in R^{ \ batch\_size \ * \ h \ * \ seq\_len \ * \ d\_k }
$$

然后对后面两个维度正常做注意力计算就可以了，四维张量怎么做矩阵乘法呢？想象一个矩阵，行数是batch_size，列数是h，每个元素都是一个矩阵，每个元素之间是相互独立的，每个元素自己做好注意力计算就好了，四维张量做乘法，就看后面两个维度就可以了。

$$
score = Q \ * \ K.T(-2,-1) / \sqrt{some\_const} \in R^{ \ batch\_size \ * \ h \ * \ q\_len \ * \ k\_len }
$$

现在q_len和k_len就是seq_len，但是在后面的自回归推理阶段，q_len就是1，k_len和v_len是seq_len，所以先在这里做区分。

对最后一维做softmax：

$$
atten\_weight \in R^{ \ batch\_size \ * \ h \ * \ q\_len \ * \ k\_len }
$$

和V做加权求和：

$$
head\_output = atten\_weight \ * \ V \in R^{ \ batch\_size \ *\ h \ * \ q\_len \ * \ d\_k }
$$

交换维度，然后拼接：
$$
head\_output \in R^{ \ batch_size \ * \ q\_len \ * \ h \ * \ d\_k }
$$
$$
head\_output \in R^{ \ batch\_size \ * \ q\_len \ * \ d\_model}
$$
最后再投影，投影矩阵$W^O \in R^{ \ d\_model \ * \ d\_model}$：
$$
output = head\_output \ * \ W^O \in R^{ \ batch\_size \ * \ q\_len \ * \ d\_model}
$$

在推理情况下，加上KV Cache的流程：

那就是上一轮自回归的输出$x_t \in R^{\ 1\ *\ d\_model}$，K、V矩阵复用之前的计算结果，q_len为1，k_len和v_len为历史生成文本。参考上面的单头注意力部分的描述吧。

### GQA/MQA/Sparse Attention

[https://zhuanlan.zhihu.com/p/1891136980370302219](https://zhuanlan.zhihu.com/p/1891136980370302219) 知乎博客介绍各种Attention

[https://zhuanlan.zhihu.com/p/1962162900111172920](https://zhuanlan.zhihu.com/p/1962162900111172920) DSA(DeepSeek Sparse Attention)

[https://zhuanlan.zhihu.com/p/1964613996830266218](https://zhuanlan.zhihu.com/p/1964613996830266218) HamiltonAttention 似乎和分布式计算相关


## Attention的系统优化

本部分介绍在实际应用中，对Attention计算采取的系统优化方法。

### Flash Attention

**主要目标**
避免直接从HBM中读写 Attention 矩阵

**挑战**
1. ⅰ) 在不获取全部输入的情况下计算 softmax
   $$ y_i = \frac{\exp(x_i)}{\sum_i \exp(x_i)} $$
2. ⅱ) 在反向传播中，不存储（那）巨大的中间 attention 矩阵
   $$ \text{Loss} = f(\text{Output}) \quad O = A @ V \quad A = \text{softmax}(\frac{Q K^T}{\sqrt{d_k}}) $$
   目标是计算 $\frac{dL}{dQ}$、$\frac{dL}{dK}$、$\frac{dL}{dV}$ 以更新 $W_Q$、$W_K$、$W_V$

**矩阵求导法则**

$$ \frac{dL}{dA} = \frac{dL}{dO} @ V^T \quad \frac{dL}{dV} = A^T @ \frac{dL}{dO} $$

$A$ 为一个向量（行向量），令 $A = \text{softmax}(Z)$。

Jacobi 矩阵 $\frac{dA}{dZ}$，其中 $M_{ij} = \frac{dA[i]}{dZ[j]} = A[i] * (\delta(i-j) - A[j])$

然后计算 $\frac{dL}{dZ} \rightarrow \frac{dL}{dQ K^T} \rightarrow \frac{dL}{dQ}$、$\frac{dL}{dK}$

**采用2个技术解决**
- ⅰ) tiling：将输入分为若干 blocks，对 blocks 多次重复处理
- ⅱ) 存储前向计算时 softmax 的缩放因子，方便在反向传播时快速重计算


**如何理解 Flash Attention 的分块**

1. 一个 Query 对应一个 Output，一块 $Q_i$ 对应一块 $O_i$，各块 $Q_i$ 的计算是互不干扰的。
   各行 (row) $O_i$ 也是互不干扰的
   各行$O_i$ 本质上是根据相关性，对 $V_i$ 的加权和
2. 对于各块 $O_i$ 的计算，需要对 $N$ 个 $V_i \in R^d$ 计算相关值，softmax 后计算加权和
   FA 将$N$个 $V_i$分组，每个小组大小为 $B_c$，
   每个小组内计算加权和，然后依次合并
   $O \leftarrow$ 小组1、小组2、…小组$T_c$


![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202510281825614.jpg)

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202510281826197.jpg)

总结：核心思想是分块计算，减少HBM访存次数。

关于“重复计算”的部分，可以这样理解：
对于一个DNN，在反向传播时，计算梯度要用到中间隐藏层的中间结果，如果全部保存，HBM占用太高了，可以选择几层保存起来。在反向传播时，找到前面最近的保存点，重新前向计算一次，再计算梯度。

[https://zhuanlan.zhihu.com/p/1953761827025584899](https://zhuanlan.zhihu.com/p/1953761827025584899) Flash Attention v1、v2的知乎博客

[https://modal.com/blog/reverse-engineer-flash-attention-4](https://modal.com/blog/reverse-engineer-flash-attention-4) Flash Attention v4的博客

[https://zhuanlan.zhihu.com/p/11273327848](https://zhuanlan.zhihu.com/p/11273327848) Flash Attention 知乎面经

### FlashInfer

FlashInfer是MLSys'25的工作，它是一个面向LLM推理的Attention计算引擎。它是一个基于代码生成的Attention计算引擎。

为什么需要这么一个Attention计算引擎呢？

因为P、D阶段需要的Attention计算范式不同；多请求多轮对话间KV Cache Prefix复用，也增加了新的Attention计算范式。

因为实际场景下，请求的长度、批次大小一直在变化，需要动态调整Attention计算内核来实现最优性能。

因为在KV Cache的存储上，例如：PagedAttention分页存储，radix tree存储，根据不同的应用情况KV Cache有着不同的存储范式。

因为不同的硬件上，需要不同的计算流水线，来保证充分利用硬件能力。

因为Attention算法的迭代太快了，GQA等，还有定制化的掩码、注意力分数计算范式。

在不同的场景下，不同的算法下，不同的硬件条件下，需要动态地调整Attention的计算内核，KV Cache访存方式。

- FlashInfer提出了一个统一的数据结构来管理KV Cache的存储。

- 使用JIT编译，针对不同情况下Attention生成优化后的内核代码。仍然使用Flash Attention内核代码为框架，再加上一些小的修改。输入Attention变体的说明，然后输出优化后的kernal代码。（借鉴FlexAttention的实现，通过functor自定义Attention计算流程，参与kernal代码生成。至此{Flash,Flex}$\times${Attention,Infer}笛卡尔积的四篇工作都涉及到了）

- 动态调度输入，把workload分布到各SM上，减少SM闲置时间。

### FlashDecoding++

这是清华大学和上海交通大学的一篇工作，针对LLM推理做了一些优化工作。主要是对算子做优化：

- FlashAttention中通过分块计算softmax，有效减少了HBM访存，但是同步更新softmax造成了流水线气泡。

- Flat GEMM（decode中的小batch size,prefill中的短输入）算子没有充分利用硬件性能。

- 设计动态数据流，CUDA core和Tensor core在不同batchsize下表现不一样，针对动态的输入大小和特点的硬件（CUDA core、Tensor core）去优化数据流。

### SWA（sliding window attention滑动窗口注意力）

在llama.cpp里针对部分模型实现了iswa

## KV Cache优化

虽然mamba、RWKV系列不需要KV Cache,但是类RNN模型本身的串行计算效率、遗忘、梯度等问题仍然是限制其发展的缺陷。类RNN模型我觉得在其他领域，例如：控制、科学计算、预测可能会更合适一些，对于语言模型和长上下文推理则不合适。

虽然linear attention只需要存储固定大小的隐状态矩阵，也不需要存储KV Cache，但是它的表达能力弱，而且将所有历史信息融合，也缺乏动态调整的灵活性。

对目前的LLM来说，管理大量的历史信息对应的KV Cache，并且利用其进行推理，仍然是保障模型表现所必要的做法。

在目前的LLM应用端，Agent或者RAG，都需要对本地记忆持久化，有项目例如memU使用多级文件对本地LLM助手的记忆长期化管理。这些都可以配合KV Cache一起使用。

### KV Cache驱逐/融合

这部分的核心思想是：KV Cache在HBM里占用的空间太多了，能不能去掉一些KV Cache的内容，这样可以少存一点、少算一点。

**Scissorhand**：一个token在之前的生成中很重要，在之后的生成也大概率很重要。 解释：人类在阅读的时候，只需抓住文本的“关键词”，LLM推理时KV Cache也只要存储这些关键的tokens即可。 缺点：直接驱逐一些token，如果这些token在之前不重要，但是在之后突然变得重要，那么就会导致生成效果变差。

**CAM**：Cache Merge不直接舍弃tokens，而是把不重要的tokens和重要的tokens进行“融合” 某次生成时$A_i^t$比较大，$A_j^t$比较小，这表示在本次生成中token i是关键的，token j是不关键的，我想把token j的信息融合到token i中。 

$$ \hat{V_i} \leftarrow V_i + \frac{A_j}{A_i}V_j $$

$A_j$和$A_i$表示的是未来生成时对应的Attention Score，这是不可知的，而且未来每次生成的比值也肯定会波动，所以CAM仍然不是无损压缩。CAM的意思是，尽管依次生成tokens时，$A_i$波动较大，但是连续m个tokens的$\bar{A_i}$趋势相对稳定，所以尽管不能准确预测未来的A，但是根据他们观察结果，仍然可以达到较好的效果。 

> 思考：KV Cache和CPU Cache的区别。 

>CPU Cache基于局部性原理，下一段时间可能被用到的内容放到Cache里以提升表现。多级存储系统的原理就是局部性原理。存储对象在某时刻的下一段时间内，地位是不对称的，适配多层级存储结构。（类似于切比雪夫不等式/排序不等式，访问多的给较小的代价，整体的代价最小） 

>KV Cache所有的计算内容都要存储，之后的计算中都一定要用到，只是不同的token对结果的贡献大小不同。KV Cache中存储的每一项都是必定要访存的，而且访存顺序不存在同步性，并发访存的潜质很大。

### KV Cache压缩

在边缘、异构、分布式计算系统上进行LLM推理，一旦涉及到计算数据的传输都会把模型参数、KV Cache、甚至是计算中间激活结果都要先压缩再传输。

为什么在边缘计算场景需要压缩呢，在MLsys'25的一篇论文：MEADOW中，它在Xilinx上针对边缘LLM推理设计了新的计算架构、数据流。

它提到边缘计算场景通常缺少HBM，在Attention计算过程中需要反复对off-chip memory进行存取，它采用了唯一引索块（Unique Chunks）和位打包对模型参数和KV Cache进行无损压缩打包传输，在OPT-1.3B中K矩阵的压缩率到了3785,V矩阵和参数压缩率也能达到1000出头。

在MLsys'25的另一篇论文ThunderServe中，它观察到现在GPU更新换代太快了，云算力提供厂商通常还保留着许多种类的GPU，这些GPU的计算能力、存储能力、传输带宽都不一样，它也观察到LLM推理过程中，Prefill阶段和Decode阶段对算力、存储、带宽的要求也不一样，那么就可以通过顶层的调度算法，在不同阶段使用不同的GPU群计算，达到节省算力资源和提升推理效率的效果。

在这篇论文中，它也强调和使用了KV Cache压缩方法，它在传输前对KV矩阵进行低位量化、打包，传输后先解包、反量化再参与计算。在它的实验中，在两台A5000上部署LLaMA-7B时发现，低位量化可以把传输损耗从16-30%降低到4-9%，并且反量化后再参与计算对模型表现的影响较弱。

通过上面两个例子，初步论证了，无论是侧端还是云端，一旦涉及数据传输，KV Cache压缩就是非常值得做的优化手段。只要是[异构计算](../HPC-Parallel-Distribute-Computing/index.md)，那必然涉及到数据传输，也就是说大部分情况下，KV Cache压缩都是非常值得考虑的。

### KV Cache复用

LMCache最早用于企业级KV Cache复用多轮对话和对话间的KV Cache

MLsys'25有一篇论文：Optimizing LLM Queries in relational Data Analytic Workloads，在现代关系型数据库中通常都加入了LLM功能，这篇论文通过对行和行内的字段进行排序，充分复用KV Cache。
