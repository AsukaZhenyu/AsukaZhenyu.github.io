# Attention计算

本文想梳理LLM中不同情况下Attention的计算。包括推理时、训练时，也包括理论上的分析、实际部署时的情况。包括不同的Attention（MHA、GHA），不同的批处理方案等。

**推理过程**

这里是最基础的，单层attention，一个head，一个batch的情况。

令$x_t=[x_1,x_2,...,x_d] \in R^{1*d}$，是输入在隐藏层的向量，d为隐藏层维度。

推理过程只需用到当前token的$Q_t=W_q*x_t \in R^{1*d}$，所以无需Q Cache。

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

**Scissorhand**：一个token在之前的生成中很重要，在之后的生成也大概率很重要。
解释：人类在阅读的时候，只需抓住文本的“关键词”，LLM推理时KV Cache也只要存储这些关键的tokens即可。
缺点：直接驱逐一些token，如果这些token在之前不重要，但是在之后突然变得重要，那么就会导致生成效果变差。

位置关系：
> token 之前的生成 之后的生成

**CAM**：Cache Merge不直接舍弃tokens，而是把不重要的tokens和重要的tokens进行“融合”
某次生成时$A_i^t$比较大，$A_j^t$比较小，这表示在本次生成中token i是关键的，token j是不关键的，我想把token j的信息融合到token i中。
$$
\hat{V_i} \leftarrow V_i + \frac{A_j}{A_i}V_j
$$

$A_j$和$A_i$表示的是未来生成时对应的Attention Score，这是不可知的，而且未来每次生成的比值也肯定会波动，所以CAM仍然不是无损压缩。CAM的意思是，尽管依次生成tokens时，$A_i$波动较大，但是连续m个tokens的$\bar{A_i}$趋势相对稳定，所以尽管不能准确预测未来的A，但是根据他们观察结果，仍然可以达到较好的效果。

> 思考：KV Cache和CPU Cache的区别。
CPU Cache基于局部性原理，下一段时间可能被用到的内容放到Cache里以提升表现。多级存储系统的原理就是局部性原理。存储对象在某时刻的下一段时间内，地位是不对称的，适配多层级存储结构。（类似于切比雪夫不等式/排序不等式，访问多的给较小的代价，整体的代价最小）
KV Cache所有的计算内容都要存储，之后的计算中都一定要用到，只是不同的token对结果的贡献大小不同。KV Cache中存储的每一项都是必定要访存的，而且访存顺序不存在同步性，并发访存的潜质很大。

> 思考：项目方向
如果要做类似KV Cache软件的优化，一方面和计算架构关系不大，另一方面读的论文都是在GPU上做的，而且对训练好的LLM研究，模型参数的影响大。需要大量尝试，选出效果好的算法，感觉和纯算法的工作比较像。所以不太想做上面论文类似的方向，但是读了后对KV Cache和LLM推理稍微有了一点了解。
在token层次，也不好优化多层次存储调度，需要更底层一点。

------------------

**Flash Attention**

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

1. 一个 Query 对应一个 Output，一块 \( Q_i \) 对应一块 \( O_i \)，各块 \( Q_i \) 的计算是互不干扰的。
   各行 (row) \( O_i \) 也是互不干扰的
   各行 \( O_i \) 本质上是根据相关性，对 \( V_i \) 的加权和
2. 对于各块 \( O_i \) 的计算，需要对 \( N \) 个 \( V_i \in R^d \) 计算相关值，softmax 后计算加权和
   FA 将 \( N \) 个 \( V_i \) 分组，每个小组大小为 \( B_c \)，
   每个小组内计算加权和，然后依次合并
   \( O \leftarrow \) 小组1、小组2、…小组\( T_c \)


![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202510281825614.jpg)

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202510281826197.jpg)

总结：核心思想是分块计算，减少HBM访存次数。

关于“重复计算”的部分，可以这样理解：
对于一个DNN，在反向传播时，计算梯度要用到中间隐藏层的中间结果，如果全部保存，HBM占用太高了，可以选择几层保存起来。在反向传播时，找到前面最近的保存点，重新前向计算一次，再计算梯度。

[https://zhuanlan.zhihu.com/p/1953761827025584899](https://zhuanlan.zhihu.com/p/1953761827025584899) Flash Attention v1、v2的知乎博客

[https://modal.com/blog/reverse-engineer-flash-attention-4](https://modal.com/blog/reverse-engineer-flash-attention-4) Flash Attention v4的博客

[https://zhuanlan.zhihu.com/p/11273327848](https://zhuanlan.zhihu.com/p/11273327848) Flash Attention 知乎面经

-----------------

**MHA/GQA/MQA/Sparse Attention 花式Attention**

[https://zhuanlan.zhihu.com/p/1891136980370302219](https://zhuanlan.zhihu.com/p/1891136980370302219) 知乎博客介绍各种Attention

[https://zhuanlan.zhihu.com/p/1962162900111172920](https://zhuanlan.zhihu.com/p/1962162900111172920) DSA(DeepSeek Sparse Attention)

[https://zhuanlan.zhihu.com/p/1964613996830266218](https://zhuanlan.zhihu.com/p/1964613996830266218) HamiltonAttention 似乎和分布式计算相关


-----------------

**高效or改进 transformer架构**


-----------------

**LLM 结构**

[https://zhuanlan.zhihu.com/p/1935335369815094111](https://zhuanlan.zhihu.com/p/1935335369815094111) 知乎博客介绍常见LLM结构

-----------------


**LLM Service**

**highly dynamic nature of LLM workloads**