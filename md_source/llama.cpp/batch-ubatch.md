# llama_batch与llama_ubatch设计

[toc]
</br>

本文讲讲`llama_batch`和`llama_ubatch`这两个类的设计。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603241847507.png)

## llama_batch

`llama_batch`在`llama.h`文件里定义，非常简单，而且非常轻量，只包含一个int变量表示有多少tokens，还有一些指针：
```cpp
typedef struct llama_batch {
    int32_t n_tokens;
    llama_token  *  token;
    float        *  embd;
    llama_pos    *  pos;
    int32_t      *  n_seq_id;
    llama_seq_id ** seq_id;
    int8_t       *  logits;   // TODO: rename this to "output"
} llama_batch;
```
`llama_batch`就是一组tokens，指针指向这组tokens对应的信息。`llama_token`、`llama_pos`、`llama_seq_id`这三个类型都是`int32_t`的别名。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603241908864.png)

什么情况下一个token属于多个序列（seq）呢？在Encode-Decode架构中，一个encode token可能被多个decode共享，在[LLM采样](../AI-Model-Optimize/LLM-Sampling.md)中，一种方法叫Beam Search，初始的tokens会被多个beam共享。每个token所属的序列的数量不确定，所以需要一个数组记录序列的数量，另一个数组记录属于哪些序列。刚开始看的话可能会对`n_seq_id`和`seq_id`两个变量的含义感到困惑。在大部分情况下，不会有属于多个序列的情况。

一个token对应的embed是一个浮点向量，在llama中这个隐藏向量的维度通常是4096，因为每个向量的长度都是一样的，所以直接使用一个一维数组进行存储。在使用中token和embd有一个不会空就可以了，

logits可以视为一个标记数组，用于表示在不同情况下该token是否作为输出。

## llama_ubatch

`llama_ubatch`的结构就更加复杂了，初次看的时候会觉得这个结构体的设计非常奇怪。不明白它说保持`llama_ubatch`轻量是什么意思。
```cpp
struct llama_ubatch {
    uint32_t n_tokens;     // total tokens (n_seq_tokens * n_seqs)
    uint32_t n_seq_tokens; // tokens per sequence set
    uint32_t n_seqs;       // sequence sets in the ubatch
    uint32_t n_seqs_unq;   // unique sequence ids in the ubatch
    uint32_t n_pos;        // number of position inputs for each token/embedding
    //                          // size               | idx | val
    llama_token  *  token;      // [n_tokens]         | i   | id, token
    float        *  embd;       // [n_embd, n_tokens] | i   | embd
    llama_pos    *  pos;        // [n_tokens*n_pos]   | i   | pos
    int32_t      *  n_seq_id;   // [n_tokens]         | i   | -
    llama_seq_id ** seq_id;     // [n_tokens]         | s   | s0, s1, seq_id
    llama_seq_id *  seq_id_unq; // [n_seqs_unq]       | s   | seq_id
    int32_t      *  seq_idx;    // [LLAMA_MAX_SEQ]    | -   | seq_idx
    int8_t       *  output;     // [n_tokens]         | i   | -

    struct data_t {
        std::vector<llama_token>    token;
        std::vector<float>          embd;
        std::vector<llama_pos>      pos;
        std::vector<int32_t>        n_seq_id;
        std::vector<llama_seq_id *> seq_id;      // these point into the seq_id_data below
        std::vector<llama_seq_id>   seq_id_unq;
        std::vector<int32_t>        seq_idx;
        std::vector<int8_t>         output;

        std::vector<llama_seq_id> seq_id_data;
    };
    std::shared_ptr<data_t> data;
};
```
观察结构体`llama_ubatch`的空间占用，会发现它的属性只是一些固定大小的变量和指针，在内部的`data_t`结构体，它占用的空间是很大而且不确定的，和token序列的长度相关。

可以通过观察类`llama_batch_allocr`的私有方法`ubatch_add`来查看是如何构造ubatch的。数据对应的空间申请后，再让ubatch的指针指向这些空间。`llama_ubatch`的轻量性就体现再这里，它本身只是一堆指针而已。这里通过指针别名，减少使用时需要多次解引用。

换句话说，申请ubatch，不同的tokens数量，和sequence set数量、长度，对应的数据空间大小不一样，而且非常占用空间，ubatch为了保持轻量，只保留指向这些数据存储空间的指针`data`，但是使用的时候每次需要通过data解引用非常麻烦，所以设置了中间一大段属性来指向`data`的数据。

为什么要新建一个`data_t`结构体？理论上来讲可以对不同的段分开申请内存空间，然后再指向它们，仍然可以保持ubatch只有指针，这里应该是考虑到内存管理，结构体的内存空间是连续的，而且一起被构析。理论上来说要达到ubatch结构体轻量是不需要新建结构体的，但是为了内存管理方便，统一申请、统一构析，防止内存泄漏。

最上面的一段属性是描述ubatch自身组织的参数（一些int变量）。中间的指针，指向的是ubatch对应的数据，直接对应`llama_batch`的属性，当然还新加了两个属性：`seq_id_unq`、`seq_idx`，这是管理`llama_batch`到`llama_ubatch`之间映射的数据。下面的结构体和指针已经在上面解释过了。

接下来就是看ubatch是如何组织的，和batch的映射关系是怎样的。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603261828169.png)

`n_seqs_unq`指的是在该ubatch中tokens所在的序列个数。

举个例子，假如该ubatch的所有tokens都来源于这些序列：`1、4、7、8、9`，那么`n_seqs_unq`的值为5

`n_pos`表示每个token的位置编码需要几个数。

中间的数据大部分和batch里的相同，而且基本上都是直接复制过来的，只是多了两个变量：

`seq_id_unq`这个是一个数组，从小到大记录了tokens出现在哪些序列中，在上面的例子中，`seq_id_unq`的值是`[1,4,7,8,9]`

`seq_idx`表示各个序列在本ubatch中排第几，在上面的例子中，序列`4`的idx是`1`，序列`8`的idx是3，也可以理解为`seq_id_unq`的逆映射。

注意：所有的ubatch必然满足`n_tokens = n_seqs * n_seq_tokens`

（（需要完善：b_equal属性是什么意思，三种划分ubatch的方法本质上是什么意思））