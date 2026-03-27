# GGML基础

[toc]
</br>


## ggml_tensor

这里说明`ggml_tensor`的数据结构:
```c
// n-dimensional tensor
struct ggml_tensor {
    enum ggml_type type;
    struct ggml_backend_buffer * buffer;
    int64_t ne[GGML_MAX_DIMS]; // number of elements
    size_t  nb[GGML_MAX_DIMS]; // stride in bytes:
                               // nb[0] = ggml_type_size(type)
                               // nb[1] = nb[0]   * (ne[0] / ggml_blck_size(type)) + padding
                               // nb[i] = nb[i-1] * ne[i-1]
    // compute data
    enum ggml_op op;
    // op params - allocated as int32_t for alignment
    int32_t op_params[GGML_MAX_OP_PARAMS / sizeof(int32_t)];
    int32_t flags;
    struct ggml_tensor * src[GGML_MAX_SRC];
    // source tensor and offset for views
    struct ggml_tensor * view_src;
    size_t               view_offs;
    void * data;
    char name[GGML_MAX_NAME];
    void * extra; // extra things e.g. for ggml-cuda.cu
    char padding[8];
};
```
我在最开始读代码的时候，望文生义觉得`ggml_tensor`就是一个张量，但是最好把它理解为一个“结点”，这个结点存储一些信息和一个指向真正数据存放地的指针。

在llama.cpp代码中涉及到backend（后端），通常指的是硬件后端（CPU、CUDA），这里的buffer指针告诉系统，张量的存储位置（CPU的DRAM？还是GPU的HBM）

ne和nb表示张量各个维度的长度（定义张量的形状）、在各个维度上走一步需要移动多少byte（不同类型的张量，每单个数据占的字节数也不一样，不同张量的形状也不一样），这里有点像[SIMD](../NVIDIA/NVIDIA-GPU-Arch.md)里的`VLEN`和`VSTR`。

op表示得到当前张量进行的运算是什么，SRC表示由哪些张量运算得到当前张量。也就是说SRC数组指针指向的张量们经过op运算得到当前张量。

当当前张量为某个张量的视图张量时，也就是说当前张量是某个张量的切片时（类似python中cur = src[:,::5]），view_src指向源张量，view_offs表示相对源张量的偏移量。不需要拷贝可以直接用。

data指针指向数据真正存放的地址。

name是当前张量的名字，这个属性横跨了计算图构建（llama-graph.h）、数据填充（llama-context.h）两大部分，这里值得留意，后面还会提到。

`ggml_tensor`实质上就是计算图中的节点，而非张量数据。

## ggml_object and ggml_context

这里说明两个结构体：`ggml_object`、`ggml_context`。
```c
struct ggml_object {
    size_t offs;
    size_t size;
    struct ggml_object * next;
    enum ggml_object_type type;
    char padding[4];
};
struct ggml_context {
    size_t mem_size;
    void * mem_buffer;
    bool   mem_buffer_owned;
    bool   no_alloc;
    int    n_objects;
    struct ggml_object * objects_begin;
    struct ggml_object * objects_end;
};
```
可以通过函数`ggml_new_object`(/ggml/src/ggml.c line1628)来了解它们的行为：
ggml_object以链表形式连续存储在ggml_context中，offs表示该ggml_object存储位置在当前ggml_context的偏移量（size，不是第几个object），size为当前object的大小，next指针指向ggml_context中下一个object，在ggml_context里begin和end两个指针分别指向第一个object和最后一个object。

## ggml_cgraph

这里说明`ggml_cgraph`的结构体：

```cpp
struct ggml_cgraph {
    int size;    // maximum number of nodes/leafs/grads/grad_accs
    int n_nodes; // number of nodes currently in use
    int n_leafs; // number of leafs currently in use

    struct ggml_tensor ** nodes;     // tensors with data that can change if the graph is evaluated
    struct ggml_tensor ** grads;     // the outputs of these tensors are the gradients of the nodes
    struct ggml_tensor ** grad_accs; // accumulators for node gradients
    struct ggml_tensor ** leafs;     // tensors with constant data
    int32_t             * use_counts;// number of uses of each tensor, indexed by hash table slot

    struct ggml_hash_set visited_hash_set;

    enum ggml_cgraph_eval_order order;
};
```