# memory与kv cache相关代码阅读

[toc]
</br>

与memory相关的文件：
`llama-memory.h/.cpp` 顶层抽象接口
`llama-memory-recurrent.h/.cpp` 用于RWKV、Mamba等循环模型
`llama-memory-hybird.h/.cpp` 每层选择正常注意力还是循环
`llama-memory-hybrid-iswa.h/.cpp` 每层选择正常注意力（swa支持）还是循环

与kv cache相关的文件：
`llama-kv-cells.h` 管理KV Cache的元数据
`llama-kv-cache.h/.cpp` 标准KV Cache实现
`llama-kv-cache-iswa.h/.cpp` 每层选择是否需要滑动窗口

这些文件内的基本结构如下图所示：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603302053529.png)

头文件的依赖关系：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603302125398.png)

## llama-memory.h/.cpp

## llama-memory-recurrent.h/.cpp

在看models.h头文件时比较困惑DeltaNet为什么和Mamba（状态空间模型SSM，本质上是线性递归结构，可视为RNN的一种推广）、RWKV（显示RNN结构）一起处理，因为前者是以线性注意力为主，而后两者者则是在模型结构上有类似RNN的循环结构。

在看qwen35.cpp和qwen35moe.cpp的实现时发现，它们需要这个头文件。

Qwen3.5系列是混合模型：线性注意力使用的是Gated DeltaNet (GDN)，正常注意力层是GQA，在线性注意的计算中需要用到循环内存。

我们知道线性注意力是维护一个固定大小的隐状态矩阵`S_t`作为KV Cache，在自回归生成过程中每生成一个token这个隐状态矩阵就要更新，这实际上也是RNN的计算结构。

## kv-cells

kv-cells管理KV Cache的**meta data**

核心属性：

- pos：tokens的位置
- ext：扩展信息（M-RoPE需要2D位置）
- seq：属于哪个序列（一个ubatch包含多个序列，后面KV Cache按流组织也会提到）
- shift：记录偏移信息

## KV Cache

### KV Cache是如何在计算图中被使用的

以qwen35.cpp:117:build_layer_attn，和llama-graph.cpp:2090:build_attn为例说明KV Cache是如何参与到Attention的计算图中的。

当一个token经过embd、norm到达注意力层的时候（[自回归Attention详细计算过程参考](../LLM-Arch-Optimize/Attention-Optimize.md)），Attention层计算图的构建函数如下：
```cpp
ggml_tensor * llm_build_qwen35::build_layer_attn(
        llm_graph_input_attn_kv * inp,
        ggml_tensor *             cur,
        ggml_tensor *             inp_pos,
        int *                     sections,
        int                       il)
```
cur就是自回归生成中的token到注意力层前的张量，还有一个类型为`llm_graph_input_attn_kv`的输入。

```cpp
class llm_graph_input_attn_k : public llm_graph_input_i {
public:
    /*
    构造、构析、放置张量、获取张量的函数省略
    */
    ggml_tensor * self_k_idxs = nullptr; // I64 [n_batch]

    ggml_tensor * self_kq_mask     = nullptr; // F32 [n_kv, n_batch/n_stream, 1, n_stream]
    ggml_tensor * self_kq_mask_cnv = nullptr; //     [n_kv, n_batch/n_stream, 1, n_stream]

    const llama_hparams hparams;
    const llama_cparams cparams;

    const llama_kv_cache_context * mctx;
};
```
这个`llm_graph_input_attn_kv`的输入包含两个部分，k的序列、KV的掩码张量，存储KV Cache的对象mctx。

cur张量和模型参数$W_Q$、$W_K$、$W_V$矩阵投影、RoPE、norm后形成Qcur、Kcur、Vcur，然后进行下一步llama-graph.cpp:2090:build_attn

计算RoPE，将Kcur、Vcur添加到KV Cache中，然后计算Attention。

### KV Cache结构

为什么要这个属性：
```cpp
// model layer id -> KV cache layer id
std::unordered_map<int32_t, int32_t> map_layer_ids;
```
这是因为在混合架构中，有的层的Attention计算不需要KV Cache，这时候layer的层数和KV Cache的层数就不是一一对应的了。