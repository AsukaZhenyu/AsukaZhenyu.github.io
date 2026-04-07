# llama-model代码阅读

[toc]
<br/>

本文关注各个LLM架构是如何在llama.cpp里被实现的。更具体一点就是，llama.cpp是如何执行不同LLM Arch定义的计算流程的，再具体一点就是模型架构如何定义、模型参数如何加载、计算图是如何构建的（计算流程、计算规则是如何声明的）。

## llama-model.h的头文件依赖关系图
第一行为文件名（或者一系列文件名，例如qwen.cpp、qwen2.cpp、qwen2moe.cpp就只写一个qwen了），第二行为文件路径，第三行为备注，例如：模型的特点、开发商。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603291536486.png)

`models.h`和下面一大堆`.cpp`文件是针对不同Arch声明的接口和对应的实现。其用到的核心类在`llama-model.h`和`llama-graph.h`中声明，一个用于加载模型参数，另一个用于加载计算图（计算流程，计算规则），其他的文件都是一些细节。

---


## model.h

**model.h文件结构**

model.h文件主要分为两个部分，前半部分为**特殊架构的基础类**：`Mamba`、`Delta Net`（卖点似乎是线性注意力）、`RWKV6`、`RWKV7`的基础模型类。

后半部分是定义各个模型架构的构造类（llm_build_xxx，xxx指的是DeepSeek、QWen、MiniMax等），有一些类继承上面的`Mamba`基础模型（例如：`llm_build_falcon_h1`），有一些类继承`Delta Net`基础模型（例如：`llm_build_kimi_linear`），有一些类继承`RWKV6`基础模型（例如：`llm_build_rwkv6qwen2`），有一些类继承`RWKV7`基础模型（例如：`llm_build_rwkv7`），其他的类都是直接继承自`llm_graph_context`，值得注意的是上述各特殊架构基础模型也是继承自`llm_graph_context`，相当于一些特殊架构的LLM模型在中间多了一层类的抽象。我目前也不关心这些特殊架构的实现。

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
首先需要说明的是`llm_build_xxx`只是针对xxx模型构建计算图，没有任何数据参与运算，这里是在指定张量计算的规则。在继续阅读之前，请先看[ggml_tensor介绍](./ggml-basic.md#ggml_tensor)，需要理解ggml_tensor并不是存储的张量，而是一个结点，它存储这些信息：该张量的基本信息、指向张量存储地址的指针和与其他张量的关系。

这里提前回答小标题的问题：llm_build_xxx类的构造函数，实质上是在完善其父类llama_graph_context里的两个属性（因为大部分llm_build_xxx类只在其父类llama_graph_context的基础上新加一个构造函数，没有新的属性）：

```cpp
ggml_context * ctx0 = nullptr;
ggml_cgraph  * gf   = nullptr;
```

这两个东西，ctx0是一个存储ggml_tensor（也就是计算图中的结点）的内存池，gf是计算图，计算图中存储着结点数量、结点访问情况等相关信息，还有指向结点的指针。

下面以src/models/afmoe.cpp为例子具体说明如何构建计算图：

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

`llama-graph.h`文件开头先定义了非常多的input类，这些input类，在后面的代码里简称inp，这些类会在后面的`llm_graph_context`计算图构造类的构造方法中使用到：

```cpp
// llm_graph_input_embd
ggml_tensor * build_inp_embd(ggml_tensor * tok_embd) const;
// llm_graph_input_pos
ggml_tensor * build_inp_pos() const;
// llm_graph_input_attn_temp
ggml_tensor * build_inp_attn_scale() const;
// llm_graph_input_out_ids
ggml_tensor * build_inp_out_ids() const;
// llm_graph_input_mean
ggml_tensor * build_inp_mean() const;
// llm_graph_input_cls
ggml_tensor * build_inp_cls() const;
// llm_graph_input_cross_embd
ggml_tensor * build_inp_cross_embd() const;
// llm_graph_input_pos_bucket
ggml_tensor * build_inp_pos_bucket_enc() const;
// llm_graph_input_pos_bucket_kv
ggml_tensor * build_inp_pos_bucket_dec() const;
// llm_graph_input_attn_no_cache
llm_graph_input_attn_no_cache * build_attn_inp_no_cache() const;
// llm_graph_input_attn_kv
llm_graph_input_attn_kv * build_attn_inp_kv() const;
// llm_graph_input_attn_k
llm_graph_input_attn_k  * build_attn_inp_k() const;
// llm_graph_input_attn_kv_iswa
llm_graph_input_attn_kv_iswa * build_attn_inp_kv_iswa() const;
// llm_graph_input_attn_cross
llm_graph_input_attn_cross * build_attn_inp_cross() const;
// llm_graph_input_rs
llm_graph_input_rs * build_rs_inp() const;
// llm_graph_input_mem_hybrid
llm_graph_input_mem_hybrid * build_inp_mem_hybrid() const;
// llm_graph_input_mem_hybrid_k
llm_graph_input_mem_hybrid_k * build_inp_mem_hybrid_k() const;
// llm_graph_input_attn_kv_iswa
llm_graph_input_mem_hybrid_iswa * build_inp_mem_hybrid_iswa() const;
// llm_graph_input_sampling
void build_sampling() const;
```

这些input类，都只有两个方法：`set_input`（输入是ubatch）和`can_use`（输入是params），这里不同的input类和不同的架构相关。（（需要补充，重复使用是什么意思，set backend具体怎么操作的））

`llama-graph.h`里计算图核心三个类：`llm_graph_params`、`llm_graph_result`、`llm_graph_context`，刚看代码的时候会觉得这三个类，你中有我，我中有你，天下的事情就坏在这里。下面是这三个类的关系：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603301547707.png)

理解上面核心的代码是`llm_graph_context`构造函数与res相关的部分，其属性的ctx0和gf指向了res对应的指针，`llm_graph_context`对ctx0和gf的修改，其修改的是res的对象。`llm_graph_context`是计算图构造内，其属性、方法多而复杂，res只保留一些关键的信息，供后面应用。

```cpp
llm_graph_context::llm_graph_context(const llm_graph_params & params) :
    res              (params.res),
    ctx0             (res->get_ctx()),
    gf               (res->get_gf()) {
        res->set_params(params);
    }
```

在`llm_graph_context`类的方法`build_xxx`中，如果涉及到关键结点、输入输出、采样器等，会把res中对应的属性给设置了，例如（llama-graph.cpp:1516）：
```cpp
res->t_inp_tokens = inp->tokens;
```

## 总结

总结一下llama.cpp中如何实现各个不同的LLM Archs，在models.h定义的接口，各个模型对应的cpp实现，利用`llama_model`结构体加载模型参数，利用`llm_graph_context`来构造计算图，计算图的本质是记录结点之间的关系，计算图构建的结果写在`llm_graph_res`中，包括：存储节点的内存池、计算图、关键节点、计算图相关参数，这些会传输到`llama-context`中被使用。