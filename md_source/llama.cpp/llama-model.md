# llama-model代码阅读

[toc]
<br/>

本文关注各个LLM架构是如何在llama.cpp里被实现的。

## llama-model.h的头文件依赖关系图
第一行为文件名（或者一系列文件名，例如qwen.cpp、qwen2.cpp、qwen2moe.cpp就只写一个qwen了），第二行为文件路径，第三行为备注。

// 下图有更新
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603091922891.png)

下面的一大坨都是针对不同架构的LLM的具体构建实现，上面则是LLM基础类的接口设计，可以看到核心模型实现是/src/models/models.h里定义的接口，models.h的上一层是llama-model.h和llama-graph.h，这两个组件是模型构建中最核心的类，再往上层就是参数设置、adapter、memory、vocab等组件。实际上因为头文件会利用**前置声明**，尽可能减少头文件依赖，其他的KV Cache管理、model-loader等组件没有被体现，但是实际上也是被用到的。再往上就是用c定义的接口（定义一些枚举类、宏、结构体等），以及张量运算库ggml。

本文从下往上开始解读，目标是抓住llama.cpp构建LLM模型的核心（模型如何构建、计算图如何构建），然后一步步解读各组件的实现（参数设置、词汇、内存管理）。


## model.h

**model.h文件结构**

model.h文件主要分为两个部分，前半部分为**基础类**：`Mamba`、`Delta Net`（卖点似乎是线性注意力）、`RWKV6`、`RWKV7`的基础模型类。

后半部分是定义各个模型架构的构造类（llm_build_xxx，xxx指的是DeepSeek、QWen、MiniMax等），有一些类继承上面的`Mamba`基础模型（例如：`llm_build_falcon_h1`），有一些类继承`Delta Net`基础模型（例如：`llm_build_kimi_linear`），有一些类继承`RWKV6`基础模型（例如：`llm_build_rwkv6qwen2`），有一些类继承`RWKV7`基础模型（例如：`llm_build_rwkv7`），其他的类都是直接继承自`llm_graph_context`，值得注意的是上述各基础模型也是继承自`llm_graph_context`，相当于一些特殊架构的LLM模型在中间多了一层类的抽象。我目前也不关心这些特殊架构的实现。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603232013154.png)


---

**各个模型构造类的接口设计**

在model.h的接口声明里，所有类（形如：`llm_build_xxx`，xxx是LLM具体架构名称）的构造函数都只要两个参数：
```cpp
(const llama_model & model, const llm_graph_params & params)
```

除了mamba、delta net、gemma3（会加一些公有属性和方法），其余的类都基本上只有一个构造函数，或者再加上一些私有属性。在对应的`.cpp`文件就是实现上面这个构造函数。

还有一些比较特殊：
```cpp
template <bool iswa>
struct llm_build_exaone4 : public llm_graph_context {
    llm_build_exaone4(const llama_model & model, const llm_graph_params & params);
};
```
在结构体使用的时候，需要显式指定`<iswa>`的值，例如：`llm_build_exaone4<true>`，这里iswa是布尔值，表示是否使用滑动窗口注意力（SWA）

---

**llm_build_xxx类的构造函数到底在干什么**

所有的`llm_build_xxx`类都继承自`llm_graph_context`，在构造函数开始之前，先使用`llm_graph_params`参数初始化父类。

父类`llm_graph_context`的构造函数的输入就是`llm_graph_params`（llama_graph.h第754行）：
```cpp
llm_graph_context(const llm_graph_params & params);
```

在所有的`llm_build_xxx`构造开始之前，先运行父类的构造函数：
```cpp
llm_build_afmoe::llm_build_afmoe(const llama_model & model, 
                            const llm_graph_params & params) 
: llm_graph_context(params) 
{
    /*
    构造函数内容
    */
}
```
首先需要说明的是`llm_build_xxx`只是针对xxx模型构建计算图，没有任何数据参与运算，这里是在指定张量计算的规则。在继续阅读之前，请先看[ggml_tensor介绍](./ggml-basic.md#ggml_tensor)，需要理解ggml_tensor并不是存储的张量，而是一个结点存储：该张量的基本信息、指向张量存储地址的指针和与其他张量的关系。

以src/models/afmoe.cpp为例子说明如何构建计算图：

在最开始定义了两个ggml_tensor指针:cur（工作指针：指向当前正在构建的中间结果）、inpL（状态指针：保存层间传递的数据流）。下面举self attention计算图构建代码为例子，来帮助理解。
```cpp
// Q/K normalization
Qcur = build_norm(Qcur, model.layers[il].attn_q_norm, NULLLM_NORM_RMS, il);
Kcur = build_norm(Kcur, model.layers[il].attn_k_norm, NULLLM_NORM_RMS, il);
cb(Qcur, "Qcur_normed", il);
cb(Kcur, "Kcur_normed", il);

if (use_rope) {
    Qcur = ggml_rope_ext(
            ctx0, Qcur, inp_pos, nullptr,
            n_rot, rope_type, n_ctx_orig, freq_base_l, freq_scale_l,
            ext_factor, attn_factor, beta_fast, beta_slow);
    cb(Qcur, "Qcur_rope", il);
    
    Kcur = ggml_rope_ext(
            ctx0, Kcur, inp_pos, nullptr,
            n_rot, rope_type, n_ctx_orig, freq_base_l, freq_scale_l,
            ext_factor, attn_factor, beta_fast, beta_slow);
    cb(Kcur, "Kcur_rope", il);
}
```
`build_norm`和`cb`是`llm_graph_context`的方法，`build_xxx`返回一个`ggml_tensor`的指针，`cb`经过非常复杂的调用，最后调用的是`llama-context.cpp`第2084行的一个匿名函数（lambda函数），作用就是设置ggml_tensor的name属性。（这些会在下面的llama-graph部分详细说）。

上面的这些代码主要是获取一些矩阵，并且对这些矩阵做一些操作，核心是下面的`ggml_xxx`的函数（`build_xxx`函数里也会有`ggml_xxx`），它会把计算的结果矩阵存放到ctx0（详情参考[ggml_context](./ggml-basic.md#ggml_object-and-ggml_context)，本质上是一个内存池，在一片连续的内存空间存储ggml_tensor对象）然后记录计算得到的这个结果矩阵的操作（op）和源张量（SRC）。

换句话说，`ggml_xxx`的操作就是建立结点（`ggml_tensor`）之间的联系，实际上就是在建图。

```c
ggml_build_forward_expand(gf, cur);
```
最后输入最后的结点cur，输入一个空计算图gf（`ggml_cgraph`），从 `cur` 开始递归遍历，根据结点间的连接关系，把计算图中涉及的`ggml_tensor`结点加入 `gf->nodes[]`。（具体可以查看ggml/src/ggml.c:6752 ggml_visit_parents_graph，这里就是建图，主要维护每个结点的入度`use_counts`，这是拓扑排序所必须的，另外它还要维护计算图中的叶子结点，注意计算图中最后计算的张量是root结点，叶子节点是最开始的结点，它的输入是常量，不是梯度图的一部分）

执行完`llm_build_xxx`的构造函数后，把`llm_graph_context`类的下面两个属性给填满了，可以理解为一个存的是参与运算的`ggml_tensor`结点们，另一个是计算图本身（llama-graph.h:751~752）：
```cpp
ggml_context * ctx0 = nullptr;
ggml_cgraph  * gf   = nullptr;
```

## llama-model.h

在llama-model.h文件类，最主要就是定义了结构体`llama_model`。在llama-model.h里定义的结构体之间的关系如下图所示：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603172149615.png)

上面四个层就是一些`ggml_tensor`，中间的`llama_layer`也是一些`ggml_tensor`再加上上面四层。

关于llama_model结构体，它的属性主要是一些tensor的指针，它的方法主要是通过llama_model_loader结构体，来导入load这些tensor。

在llama-model.cpp中，从438行开始实现结构体llama_model的方法，到8357行结束。（一共9253行），其中加载（load）hparam的函数（495 ~ 2680），加载（load）tensors的函数（2697 ~ 7861）又占据了主导。而这些长得吓人的函数中，主要的部分又是针对不同架构的LLM适配的代码。

所以在llama_model结构体中，核心就是：

- 属性：模型超参数（Arch、Type、HParams）、模型参数的指针（Tensor *）

- 方法：加载超参数、加载模型参数

## llama-graph.h

计算图相关的类之间的耦合关系比较复杂，计算图的输入是结构体`llama_ubatch`，在介绍计算图相关的类之前，请先阅读[batch与ubatch介绍](./batch-ubatch.md)。