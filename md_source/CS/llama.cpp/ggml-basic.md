# GGML基础

[toc]
</br>

## ggml structure

llama.cpp能够支持众多硬件/后端，其核心在于ggml库。

发现一个好东西：[DeepWiki](https://deepwiki.com/ggml-org/ggml)，对于GitHub上开源的仓库，它有AI自动生成的图文并茂的Wiki，并且会随项目更新而更新Wiki内容，可以先看wiki熟悉项目结构，而且有LLM聊天框，可以询问项目的一些细节，不需要登陆，对话你可以通过保存对话网页后续重复访问。这就非常方便了，不像我之前先git clone下来用Claude Code分析项目文件，虽然效果差不多，但是API贵啊，随便弄弄大几百就没了，有免费的为什么不用。

这里我们看ggml/src/CMakeLists.txt下的两端代码：
```cmake
add_library(ggml-base
            ../include/ggml.h
            ../include/ggml-alloc.h
            ../include/ggml-backend.h
            ../include/ggml-cpp.h
            ../include/ggml-opt.h
            ../include/gguf.h
            ggml.c
            ggml.cpp
            ggml-alloc.c
            ggml-backend.cpp
            ggml-opt.cpp
            ggml-threading.cpp
            ggml-threading.h
            ggml-quants.c
            ggml-quants.h
            gguf.cpp)

add_library(ggml
            ggml-backend-dl.cpp
            ggml-backend-reg.cpp)
add_library(ggml::ggml ALIAS ggml)

target_link_libraries(ggml PUBLIC ggml-base)
```

这里可以看出ggml库的结构，ggml-base包含核心实现，ggml包含后端动态加载和注册机制（详情请查看[#ggml_backend](./ggml-basic.md#regregistry)）

（（这里可以看出ggml库的几个组件））

## ggml

本节看ggml开头的相关文件，包括：ggml.h、ggml-impl.h、ggml.c、ggml.cpp、ggml-cpp.h

### ggml.h

这个文件一开头就是一大段注释，简要介绍了一下ggml张量库，内容包括：

- 一组张量操作
- 自动微分
- 基础优化算法

用户通过定义**计算图**来定义函数。定义好计算图后，可以计算函数的值 和/或 对输入的梯度。

在定义计算图的时候没有任何实际计算，实际的计算发生在ggml_graph_compute()函数，需要我们自己显式调用。

需要显式指定哪些张量是输入，这点在其他代码会体现，输入输出结点会特殊处理。ggml中的自动微分和优化函数需要知道哪些结点是输入。

计算图一次定义可以多次反复计算。

**自动微分**

数值方法就是求极限，存在截断误差和舍入误差，且对高维输入计算开销很大（需要多次函数求值）。

符号方法就是手动求导的自动化，缺点是表达式会指数膨胀，而且函数必须写出来，这意味着程序中的条件、循环无法被使用

自动微分（AD）：Forward mode（前向模式）与Reverse mode（反向模式）。它既能像数值微分一样直接得到数值结果，又能像符号微分一样保证高精度。

AD的核心是计算图（结点是输入和中间计算结果，边是运算本身）与链式法则，通过计算图精确追踪基本运算的导数，兼顾了效率和精度。

|模式|计算方式|时间复杂度|适用场景|
|-|-|-|-|
|前向计算|同时计算函数值与导数（一次前向传播）|1次函数求值*输入维度|输入少，输出多（$R^n \rightarrow R^m,m>>n$）|
|反向模式|先正向求值，再反向传播梯度|1次函数求值*输入维度|输出少，输入多|

在神经网络中，例如分类器$R^n \rightarrow R^1$，这种标量损失函数，通常使用反向模式传播梯度。在机器学习里通常使用反向计算模式，ggml库也是只有反向计算模式。

### ggml-impl.h

实现的中间头文件，会有一些内部实现的结构体。方便函数实现，而这些实现细节不向库的使用者暴露。包括：哈希表实现、数据格式转化（FP16、FP32）、判断计算图结点能否融合（fuse）等。

**位图与哈希表**

位图的定义非常简单，就是32为无符号整数：
```cpp
typedef uint32_t ggml_bitset_t;
```
在实际使用时，我们会使用一个位图数组来表示哈希表中是否存在某对象，一个位图可以表示32个对象是否存在。
```cpp
#define BITSET_SHR 5 // log2(sizeof(ggml_bitset_t)*8)
#define BITSET_MASK (sizeof(ggml_bitset_t)*8 - 1)

static size_t ggml_bitset_size(size_t n) {
    return (n + BITSET_MASK) >> BITSET_SHR;
}

static inline bool ggml_bitset_get(const ggml_bitset_t * bitset, size_t i) {
    return !!(bitset[i >> BITSET_SHR] & (1u << (i & BITSET_MASK)));
}
```
第一个计算size的函数表示，需要多少个uint32才能存下n个对象的位，来表示是否存在。

哈希表的结构如下所示：
```cpp
struct ggml_hash_set {
    size_t size;
    ggml_bitset_t * used;       // whether or not the keys are in use i.e. set
    struct ggml_tensor ** keys; // actual tensors in the set, keys[i] is only defined if ggml_bitset_get(used, i)
};
```
也是非常简单，专门针对ggml_tensor而建立的哈希表，利用ggml_tensor指针地址计算哈希值，使用线性探测解决哈希冲突，通过外部的函数插入与查找某ggml_tensor的编号，使用keys访问。

$$
ggml\_tensor地址 \rightarrow base\ hash\ value \rightarrow linear\ probing \rightarrow index
$$

## Tensor Operations and Computation Graphs

### ggml_tensor

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

在llama.cpp代码中涉及到backend（后端），通常指的是硬件架构后端（CPU、CUDA），buffer是张量数据实际存储的位置，存在于不同的后端设备（CPU、GPU0、GPU1 etc）之上。buffer是一块连续的内存空间，在实际推理中可能会申请多个buffer来存储张量，这个指针指明本张量存储的buffer是哪个。

data指针指向数据真正存放的地址。一个buffer里面会存储很多张量，通过data指针指向本张量开头的地址，以在buffer中访问到张量数据。buffer内部存储管理的细节请看[#Buffer与内存申请](./ggml-basic.md#buffer-and-memory-alloc)。

ne和nb表示张量各个维度的长度（定义张量的形状）、在各个维度上走一步需要移动多少byte（不同类型的张量，每单个数据占的字节数也不一样，不同张量的形状也不一样），这里有点像[SIMD](../NVIDIA/NVIDIA-GPU-Arch.md)里的`VLEN`和`VSTR`。最近在微信公众号上看到一篇介绍[CuTe](../HPC-Parallel-Distribute-Computing/CUTLASS-CuTe-DSL.md)的Layout代数的文章（微信搜索zartbot layout），内容也有点像，但限于我的数学水平看不懂。

op表示得到当前张量进行的运算是什么，SRC表示由哪些张量运算得到当前张量。也就是说SRC数组指针指向的张量们经过op运算得到当前张量。

当当前张量为某个张量的视图张量时，也就是说当前张量是某个张量的切片时（类似python中cur = src[:,::5]），view_src指向源张量，view_offs表示相对源张量的偏移量。不需要拷贝可以直接用。

name是当前张量的名字，这个属性横跨了计算图构建（llama-graph.h）、数据填充（llama-context.h）两大部分，这里值得留意，后面还会提到。

`ggml_tensor`实质上就是计算图中的节点，而非张量数据。

### ggml_object and ggml_context

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

### ggml_cgraph

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

cgraph的结构如下图所示：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202604061428569.png)

和普通的DAG不同的是，图的指向是反的，由子节点指向父节点。计算图中最后计算的张量是root结点，叶子节点是最开始的结点，它的输入是常量，不是梯度图的一部分。

ggml/src/ggml.c:6752 ggml_visit_parents_graph，这里就是建图函数，主要维护每个结点的入度`use_counts`，表示当前节点被多少节点的计算所需要。计算图的数据结构将叶子节点和其他节点分开管理，遍历计算图的时候会把叶子节点放入leafs数组里，其他节点放到nodes数组里。通过这个函数我们就可以总结部分cgraph的属性：

- n_nodes其他非叶子节点的数量，也是nodes数组的长度
- n_leafs叶子节点的数量，也是leafs数组的长度
- use_counts表示节点的入度，也表示有多少节点依赖本节点，也表示子节点的数量
- visited_hash_set在建图中的帮助数据结构，防止重复访问节点，图论基本操作

## ggml_backend

在ggml/include/ggml-backend.h里声明了ggml暴露给库使用者的接口，我们可以看到有以下几个部分：

- `Backend buffer type`与`Backend buffer`
- `Backend (stream)`
- `Events` -> 事件，用于计算同步
- `Backend device`
- `Backend (reg)` -> 实现在`ggml-backend.cpp`
- `Backend registry` -> 实现在`ggml-backend-reg.cpp`
- `Backend scheduler` -> 支持多后端协同推理，buffer申请、张量复制、后端间张量拷贝
- `Utils` -> 一些工具函数，将计算图复制到其他后端、比较两个后端的输出、初始化张量、构造CPU后端缓冲区/缓冲区类型（CPU缓存类型对所有后端都兼容）

在公共接口开头定义了一些类的别名，这些类实质上就是backend设计中核心的对象：

```cpp
typedef struct ggml_backend_buffer_type * ggml_backend_buffer_type_t;
typedef struct ggml_backend_buffer * ggml_backend_buffer_t;
typedef struct ggml_backend_event * ggml_backend_event_t;
typedef struct ggml_backend * ggml_backend_t;
typedef void * ggml_backend_graph_plan_t;
typedef struct ggml_backend_reg * ggml_backend_reg_t;
typedef struct ggml_backend_device * ggml_backend_dev_t;
```

在scheduler部分开始前也有类似的声明，这个类和其他类不一样：
```cpp
typedef struct ggml_backend_sched * ggml_backend_sched_t; // 定义在ggml-backend.cpp
```

这些结构体的定义代码放在ggml/src/ggml-backend-impl.h，这个是中间实现头文件，内容不向库的使用者暴露。除了上述类的定义，中间头文件还包括一些内部使用的函数。

公共接口剩余的部分就是声明一些函数，这些函数的输入部分是上面定义的类型。

自此我们已经抓住ggml_backend设计的核心，后端的八大组件和操作的对象都已经说明完成。

### backend文件组织

`ggml-backend.h`声明对外接口
`ggml-backend-impl.h`中间头文件，定义结构体和内部函数
`ggml-backend-dl.h/.cpp`处理Dynamic Loading，动态加载动态库，核心只有两个函数：在操作系统加载动态库，获得对应的句柄；还有一个函数是通过句柄与（函数/变量等）对象的名称，获取其地址。举个例子：
```cpp
// 获取句柄
HMODULE handle = LoadLibraryW(path.wstring().c_str());

// 通过句柄与名称访问对象并应用
typedef int (*my_func_t)(int);
my_func_t func = (my_func_t) GetProcAddress(handle, "myFunction");
int result = func(42);
```
`ggml-backend-reg.cpp`处理多端设备注册，需要上面的dl文件
`ggml-backend.cpp`实现文件，一共2271行，其中661~1880行都是在实现调度器scheduler的接口

### 函数指针

在ggml_backend中广泛使用函数指针，例如在`ggml-backend.h:200`

```cpp
typedef ggml_backend_buffer_type_t   (*ggml_backend_split_buffer_type_t)(int main_device, const float * tensor_split);
```

遮掉typedef，就是声明函数指针的代码，返回类型是`ggml_backend_buffer_type_t`，参数列表是`(int main_device, const float * tensor_split)`，指针名称是`ggml_backend_split_buffer_type_t`前面的*表示声明的变量是指针。

加上typedef后，这里变成了定义了一个函数指针类型，`ggml_backend_split_buffer_type_t`从指针名字变成了函数指针类型名字，可以直接用它声明函数指针变量，或者作为函数参数列表类型。

在实现对应函数时的写法是：
```cpp
ggml_backend_buffer_type_t my_func(int a, const float * b){
    /*
    具体实现
    */
}
```
然后可以声明函数指针指向这个函数：
```cpp
ggml_backend_split_buffer_type_t my_func_pointer=my_func; // 或者&my_func，大部分情况会自动退化为函数首地址
```

或者作为函数的参数列表类型：
```cpp
char * get_something_name(ggml_backend_split_buffer_type_t a);
```


对于函数指针的使用，在backend中主要类的设计，几乎都采取下面的范式`ggml-backend-impl.h:17~35`：

```cpp
struct ggml_backend_buffer_type_i {
    const char *          (*get_name)      (ggml_backend_buffer_type_t buft);
    // allocate a buffer of this type
    ggml_backend_buffer_t (*alloc_buffer)  (ggml_backend_buffer_type_t buft, size_t size);
    // tensor alignment
    size_t                (*get_alignment) (ggml_backend_buffer_type_t buft);
    // (optional) max buffer size that can be allocated (defaults to SIZE_MAX)
    size_t                (*get_max_size)  (ggml_backend_buffer_type_t buft);
    // (optional) data size needed to allocate the tensor, including padding (defaults to ggml_nbytes)
    size_t                (*get_alloc_size)(ggml_backend_buffer_type_t buft, const struct ggml_tensor * tensor);
    // (optional) check if tensor data is in host memory and uses standard ggml tensor layout (defaults to false)
    bool                  (*is_host)       (ggml_backend_buffer_type_t buft);
};

struct ggml_backend_buffer_type {
    struct ggml_backend_buffer_type_i  iface;
    ggml_backend_dev_t device;
    void * context;
};
```

有一个接口结构体，里面全部是函数指针，通过这个接口类来访问这些接口函数。

使用函数指针的原因很简单，这些实现函数在不同的后端（CPU、CUDA、Vulkan）上代码不一样，实际调用时根据实际硬件指向具体的函数实现代码调用。

这里可以总结一个ggml_backend相关类的设计范式：

- `ggml_backend_xxx_i`函数指针接口，函数都需要下面类的指针作为参数
- `ggml_backend_xxx`类本身，内含上述函数指针接口
- `ggml_backend_xxx_t`该类的指针类型，通常作为函数参数


### reg/registry

后端/设备注册分为两个部分实现，刚看的时候可能会觉得困惑，先理清后端与设备之间的关系：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202604091947996.png)

一个backend对应一个device，一个device可以有多个backends，一类设备对应一个reg，所有类型reg对应registry。

reg和registry相关代码，只在设备注册、设备枚举、设备查找、加载设备对应的运行时库时出现，它像一个“目录”。在调度计算时，直接和backend交互，可以看到backend schedule和llama-context都没涉及reg，直接和backend交互。

**Backend (reg)**

在`ggml-backend-impl.h`里实现的是后端的注册，处理单个后端的注册。内容包括：后端名称、本后端设备数量、获得第i个设备、获得该后端的函数指针（可以添加自定义函数），核心代码如下所示：

```cpp
struct ggml_backend_reg_i {
    const char * (*get_name)(ggml_backend_reg_t reg);

    // enumerate available devices
    size_t             (*get_device_count)(ggml_backend_reg_t reg);
    ggml_backend_dev_t (*get_device)(ggml_backend_reg_t reg, size_t index);

    // (optional) get a pointer to a function in the backend
    // backends can add custom functions that are not part of the standard ggml-backend interface
    void * (*get_proc_address)(ggml_backend_reg_t reg, const char * name);
};
```

**Backend registry**

在`ggml-backend-reg.cpp`里实现的是多个reg的注册，这里就涉及不同计算平台，即不同硬件架构、编程模型之间协调，看代码会发现有很多`#ifdef GGML_USE_CUDA`这样的宏处理语句。

这里简单分析一下注册表要分两个文件实现的原因，reg实际上定义的是所有后端统一的规范接口形式，registry实际上做的是适配不同种后端的情况，并且需要通过dl动态加载不同后端对应的动态库（例如：CUDA runtime库），前者偏商务，后者偏运动。

核心结构体是：`ggml_backend_registry`，代码大部分是遍历/获取后端/设备，理解了上面后端与设备之间的关系就很好理解了。

总结一下：类`ggml_backend_reg`管理一类计算平台的多个设备，类`ggml_backend_registry`管理所有的计算平台和设备。

### Device and Stream

**Device**

这里涉及一个设计模式：
$$
Device \rightarrow Context \rightarrow Stream
$$

在一个计算设备中，里面包含不同的执行上下文（Context），在一个上下文下又有多个执行流（指令流/Stream），也就是说从硬件到执行会有这么几个层次。

在学习操作系统进程部分时应该了解到，进程的组成部分包括：进程控制块（PCB）、程序段和数据段。在PCB中包含了进程的属性与进程的上下文信息（寄存器值、PC位置、堆栈指针）。也可以按照进程来理解，下面说的一大堆本质上就是：进程申请、进程间同步。进程是操作系统资源分配的基本单位，程序员编写一个程序要在计算机上运行，也是以进程的形式运行的（进程是程序的一次执行实例）。

这里我想表达的是：一个device会有很多stream，，一个`ggml_backend_device`（设备）对应多个`ggml_backend`（操作流/进程），同样的`ggml_backend`也是ggml后端分配计算资源的基本单位，也是暴露给前端计算图逻辑编写程序员的基础抽象。

在看`ggml_backend`结构体属性时有一个属性是：

```cpp
ggml_backend_dev_t device;
```

在`ggml_backend_device`的方法接口里有一个方法是：
```cpp
ggml_backend_t (*init_backend)(ggml_backend_dev_t dev, const char * params);
```
虽然一个device对应多个stream，而且stream的初始化也依赖device完成，每个stream内部也需要表识自己来自哪个device，但是到此为止了，stream一旦创建，我们就直接管理stream，而不是通过device来管理stream。

在看device接口设计时也能看到几乎没有什么方法：
- device设备相关的元数据（Meta Data）
获取device的名称、描述、内存、类型、推荐的buffer类型、

- 一个设备里运行着多个操作流，操作流的声明也依赖于设备
初始化stream、

- 判断函数/操作是否合法，推荐如何申请buffer
判断支持哪些操作、支持哪些buffer类型，这些是设备相关的，stream里也有这些函数接口，但是不允许使用，我推测是一个设备中的streams这些都是一样的，但是却在stream相关代码中使用，所以最初的时候接口在stream实现，后面迁移到device。还有一部分选项是与主机内存（host memory或者说内存）之间的操作

- 设备事件（Event），用于各操作流之间同步，类似于信号量
声明事件、释放事件、同步事件

**Backend （Stream）**
毕竟不是进程，整个llama.cpp推理引擎的核心逻辑是，前端cpp文件定义好静态计算图后放到后端进行计算。

stream的核心接口是：

- compute computation graph
计算计算图，还有一个接口是设计compute plan然后执行这个plan，但是现在没有使用

- tensors operation
设置tensor、获取tensor、在不同的streams间转移tensor

- 事件与同步
发起事件、等待事件、等待所有悬挂的操作

- meta data
获取该stream的名字

- 释放（free）该stream

到这里，整个ggml的后端结构已经被我们揭示清楚了，一个推理系统可能有多个计算平台，一个计算平台可能有多个设备，每个设备上运行着多个执行流，这些执行流直接执行计算图。而且在编程时我们接触到的就是执行流`ggml_backend`相关的接口，因为在前端我们就是通过定义LLM Archs的静态计算图来描述LLM inference计算的。

### Buffer and Memory alloc

要理解buffer type和buffer相关的代码，需要结合`ggml-alloc.h/.c`两个文件一起看。

buffer是存放tensor数据的实际位置，在`ggml_tensor`结构体中有一个类型为`ggml_backend_buffer`的属性，表示tensor数据实际存放位置。还有一个`void * data`指针指向tensor数据存储的开头位置。

buffer的内存空间就是一个摆满tensor数据的内存池，在部分高性能后端要求数据存储位置对齐（alignment），所以在单个buffer内存管理中，我们看到的是在满足对齐标准的情况下，尽可能紧凑地存tensor数据。

这一点体现在`ggml-alloc.h/.c`中`tallocr`类的设计和函数中体现：
```cpp
// Tensor allocator
struct ggml_tallocr {
    ggml_backend_buffer_t buffer;
    void * base;
    size_t alignment;
    size_t offset;
};

GGML_API struct ggml_tallocr ggml_tallocr_new(ggml_backend_buffer_t buffer);
GGML_API enum ggml_status    ggml_tallocr_alloc(struct ggml_tallocr * talloc, struct ggml_tensor * tensor);
```

alignment是由后端设备决定的一个固定大小的值，通常是2的n次方（4、8、16、32），硬件在读取对齐存储的数据速度会块一些。base是当前buffer的起始位置，offset是在buffer中存储下一个tensor的起始地址，这个地址是对齐的（被alignment整除的）。

`tallocr`类就是专门在buffer中写入tensor数据的。

理解完上面的内容再看buffer type就非常好理解了，就是在描述buffer的性质，这些性质和上面的写入过程是紧密相关的：
```cpp
struct ggml_backend_buffer_type_i {
    const char *          (*get_name)      (ggml_backend_buffer_type_t buft);
    // allocate a buffer of this type
    ggml_backend_buffer_t (*alloc_buffer)  (ggml_backend_buffer_type_t buft, size_t size);
    // tensor alignment
    size_t                (*get_alignment) (ggml_backend_buffer_type_t buft);
    // (optional) max buffer size that can be allocated (defaults to SIZE_MAX)
    size_t                (*get_max_size)  (ggml_backend_buffer_type_t buft);
    // (optional) data size needed to allocate the tensor, including padding (defaults to ggml_nbytes)
    size_t                (*get_alloc_size)(ggml_backend_buffer_type_t buft, const struct ggml_tensor * tensor);
    // (optional) check if tensor data is in host memory and uses standard ggml tensor layout (defaults to false)
    bool                  (*is_host)       (ggml_backend_buffer_type_t buft);
};
```
- alloc_buffer:
通过buffer type申请一块buffer内存空间使用
- get_alignment:
根据设备特性，获得内存地址对齐的基准
- get_max_size:
设备上的存储空间不是无限的，所以需要规定buffer最多写到哪里，在`tallocr`也有检查当前tensor如果写入是否会溢出。
- get_alloc_size:
判断当前张量写入大概需要多少空间

还有一点值得提的是：buffer只提供存储功能，它没记录哪些位置是tensor的起点，所以每次写入时要在`ggml_tensor`里记录数据开始位置。

再看buffer本身提供的函数接口也很好理解了，主要就是对buffer内的tensor进行操作，因为buffer本身不记录tensor存储开始位置与结束位置，所以相关函数你需要自己提供tensor开始位置与tensor数据大小：
```cpp
struct ggml_backend_buffer_i {
    // (optional) free the buffer
    void         (*free_buffer)  (ggml_backend_buffer_t buffer);
    // base address of the buffer
    void *       (*get_base)     (ggml_backend_buffer_t buffer);
    // (optional) initialize a tensor in the buffer (eg. add tensor extras)
    enum ggml_status (*init_tensor)(ggml_backend_buffer_t buffer, struct ggml_tensor * tensor);
    // tensor data access
    void         (*memset_tensor)(ggml_backend_buffer_t buffer,       struct ggml_tensor * tensor,     uint8_t value, size_t offset, size_t size);
    void         (*set_tensor)   (ggml_backend_buffer_t buffer,       struct ggml_tensor * tensor, const void * data, size_t offset, size_t size);
    void         (*get_tensor)   (ggml_backend_buffer_t buffer, const struct ggml_tensor * tensor,       void * data, size_t offset, size_t size);
    // (optional) tensor copy: dst is in the buffer, src may be in any buffer, including buffers from a different backend (return false if not supported)
    bool         (*cpy_tensor)   (ggml_backend_buffer_t buffer, const struct ggml_tensor * src, struct ggml_tensor * dst);
    // clear the entire buffer
    void         (*clear)        (ggml_backend_buffer_t buffer, uint8_t value);
    // (optional) reset any internal state due to tensor initialization, such as tensor extras
    void         (*reset)        (ggml_backend_buffer_t buffer);
};
```

在实际LLM推理计算过程中，通常不会直接利用tallocr在buffer中写入张量，我们会使用一系列优化方法来规划buffer空间的使用，需要动态的灵活的写入读出策略，tallocr只提供了最简单的写入方法，可能会用于一些自行编写的简单计算图的计算。

下面一节会介绍ggml如何针对计算图执行特征，对buffer内存空间的利用进行优化。

**Graph allocator**

在`ggml-alloc.h/.c`中内存管理的核心是graph allocator，在`ggml-alloc.h`里文件就分为两个部分：`Tensor allocator`、`Graph allocator`。`ggml-alloc.h`头文件里`Graph allocator`接口的定义非常简单，就是：
- 图分配器类自己的创建、释放；
```cpp
typedef struct ggml_gallocr * ggml_gallocr_t;

GGML_API ggml_gallocr_t ggml_gallocr_new(ggml_backend_buffer_type_t buft);
GGML_API ggml_gallocr_t ggml_gallocr_new_n(ggml_backend_buffer_type_t * bufts, int n_bufs);
GGML_API void           ggml_gallocr_free(ggml_gallocr_t galloc);
```
这里我们可以看到有两种申请`ggml_gallocr`的方式，一个是单buffer的，一个是多buffer的。这里提前剧透一下，这里的buffer数量指的并不是`ggml_backend_buffer`的数量，而是对应的虚拟buffer的数量，一个虚拟buffer对应一个`ggml_backend`，也就是一个上下文执行流，在设备中运行的一个上下文执行流`ggml_backend`可以利用设备中若干`ggml_backend_buffer`组成一个拥有“连续内存地址”的虚拟buffer。

- 根据计算图预分配buffer空间；
```cpp
// 单buffer计算图 buffer空间预留
GGML_API bool ggml_gallocr_reserve(ggml_gallocr_t galloc, struct ggml_cgraph * graph);
// 将多buffers空间预留结果保存到sizes数组里面去
GGML_API void ggml_gallocr_reserve_n_size(
    ggml_gallocr_t galloc,
    struct ggml_cgraph * graph,
    const int * node_buffer_ids,
    const int * leaf_buffer_ids,
    size_t * sizes);
// 多buffer计算图 buffers空间预留 
GGML_API bool ggml_gallocr_reserve_n(
    ggml_gallocr_t galloc,
    struct ggml_cgraph * graph,
    const int * node_buffer_ids,
    const int * leaf_buffer_ids);

```
同样的，这里的预留空间函数也是考虑了单buffer与多buffers的情况，在多buffers情况下，函数ggml_gallocr_reserve_n会自动预分配多个buffer的空间，函数ggml_gallocr_reserve_n_size会把在上面函数预分配的结果写到数组sizes里面。

- 根据计算图实际分配空间；
```cpp
GGML_API bool ggml_gallocr_alloc_graph(ggml_gallocr_t galloc, struct ggml_cgraph * graph);

GGML_API size_t ggml_gallocr_get_buffer_size(ggml_gallocr_t galloc, int buffer_id);

```

第一个函数是计算图申请空间的核心，同样的也是分为两种情况：

1. 单buffer计算图，如果计算图拓扑发送变化，自动重新分配空间
2. 多buffers计算图，如果计算图发生变化会运行失败，需要先自行运行ggml_gallocr_reserve_n这个函数，来重新分配空间

总结一下，在graph allocator定义的接口里，根据计算图使用单buffer还是多buffers，采取不同的操作，但是思路都是一样的：

- 单buffer，由于ggml_gallocr_alloc_graph会自动重新申请buffer空间，所以预留空间函数可以不执行。这是因为单buffer的情况比较简单，可以直接根据计算图计算出需要的单块存储空间。
- 多buffers，需要自行预留buffers的空间，然后再实际申请内存空间。

这里可以看到，核心分为两步：reserve、alloc。我们结合实现文件`ggml-alloc.c`来看这两部到底在干什么：

- reserve函数，实质上就是根据计算图确定各张量的存储地址，确定整体的内存布局。这个函数实质上填充了`ggml_gallocr`类的属性。最复杂的就是这个函数，包含了类似操作系统中的内存管理来预分配各tensor地址，来减少内存碎片，并且进行张量的生命周期分析，达到内存复用的效果。

- alloc函数，这个函数比较简单，根据上述函数确定的内存布局和各张量的存储位置，绑定`ggml_tensor`的buffer块和块内的存储地址，同时在buffer内初始化该张量。


在看源码实现的时候，发现上面的reserve和alloc函数都是默认按照多buffer来实现的，单buffer只是特殊情况，通过特定参数调用多buffer情况的函数实现。例如：
```cpp
bool ggml_gallocr_reserve(ggml_gallocr_t galloc, struct ggml_cgraph *graph) {
    return ggml_gallocr_reserve_n(galloc, graph, NULL, NULL);
}
```

在深入reserve函数是如何管理内存空间之前，需要了解ggml如何实现：内存空间动态申请， 多buffers的内存管理。下面是`ggml_gallocr`的多层次管理内存的架构图：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202604051545869.png)

在`ggml_gallocr`的视角下，一个buffer实质上是一个虚拟buffer，由多个`ggml_backend_buffer`组成的，一个拥有连续内存空间地址的虚拟buffer。

一个vbuffer可以分为多个chunks，一个chunk就是一个`ggml_backend_buffer`，在一个chunk下又被分为若干blocks。

如何在一个vbuffer里面写入东西呢？会通过类`ggml_dyn_talloc`来实现，vbuffer里面所有的`ggml_backend_buffer`的buffer type是相同的，对于相同的buffer type，只需要一个`ggml_dyn_talloc`对象，因为它本质上只是一个写入工具：

```cpp
// check if the same buffer type is used multiple times and reuse the same allocator
for (int j = 0; j < i; j++) {
    if (bufts[i] == bufts[j]) {
        galloc->buf_tallocs[i] = galloc->buf_tallocs[j];
        break;
    }
}

if (galloc->buf_tallocs[i] == NULL) {
    size_t alignment = ggml_backend_buft_get_alignment(bufts[i]);
    size_t max_size = ggml_backend_buft_get_max_size(bufts[i]);
    galloc->buf_tallocs[i] = ggml_dyn_tallocr_new(alignment, max_size);
}
```

具体是如何写入的呢，在下面的函数里说明了：
```cpp
static struct buffer_address ggml_dyn_tallocr_alloc(struct ggml_dyn_tallocr * alloc, size_t size, const struct ggml_tensor * tensor)
```
下面的一段核心代码说明了，它是如何寻找tensor的存储位置的：
```cpp
if (block->size >= size && block->size <= best_fit_size) {
    best_fit_chunk = c;
    best_fit_block = i;
    best_fit_size = block->size;
}
```
在一个vbuffer里所有的chunks和里面的blocks里找一段大小大于要求，且大小最小的块来存放该tensor。这非常像OS里的一个内存管理的算法，这个算法非常简单，而且容易产生外部碎片。

（（chunks、blocks申请、管理的代码分析暂且省略，目前已经足够往下理解））

接下来看reserve代码，其实现分为两个部分，先使用哈希表申请空间，然后在根据哈希表里面的内容填充到`ggml_gallocr`里的`node_allocs`属性里。下面是`ggml_gallocr`的属性。
```cpp
struct ggml_gallocr {
    ggml_backend_buffer_type_t * bufts; // [n_buffers]
    struct vbuffer ** buffers; // [n_buffers]
    struct ggml_dyn_tallocr ** buf_tallocs; // [n_buffers]
    int n_buffers;

    struct ggml_hash_set hash_set;
    struct hash_node * hash_values; // [hash_set.size]

    struct node_alloc * node_allocs; // [n_nodes]
    int n_nodes;

    struct leaf_alloc * leaf_allocs; // [n_leafs]
    int n_leafs;
};
```

上面四个属性已经解释过了，第5个属性是一个哈希表，详情请看[位图与哈希表](./ggml-basic.md#ggml-implh)，第6个属性是在使用哈希表申请空间时，node的信息。在reserve函数的第1步里，使用哈希表预分配张量地址时，会把节点在计算图中的特征、预分配的地址存放在第6个属性里。

最后两个属性把计算图中叶子节点和其他节点分开处理，这两个属性就是在alloc函数里实际用到的信息。也是reserve函数第二步复制的目的地。

为什么使用哈希表先预分配地址，实际上在使用哈希表预分配的过程中会做一些优化。哈希表本质上是对象到索引的映射，这里使用哈希表是为了建立从`ggml_tensor`到`hash_node`的映射，`hash_node`是一个记录了结点信息的结构体，在分配内存的时候会模拟计算图执行时结点的生命周期，为了不影响`ggml_tensor`自己的数据，所以需要一个新的存储空间来记录各个结点在计算图变化时候的属性。

“模拟计算图执行时结点的生命周期”，意思是在计算图执行过程中一些先计算的结点不再被依赖，不再被需要，则这些节点占用的空间可以被释放，下面会介绍计算图执行过程中的时空局限性，解释执行计算图时优化内存利用的空间。

**liveness分析/内存复用**

ggml_gallocr会对结点张量进行生命周期分析，实现内存重用。但是这句话实在是太抽象了，我在文档里看了很多次，还是不明白它是什么意思。

我们先从父节点的复用来看，计算图内存优化的空间在哪里。什么叫复用父节点？考虑这个计算步骤：$b=ReLU(a)$，计算图如下所示：
$$
a \rightarrow b
$$
两个计算结点，代表两个张量，中间的箭头表示激活函数这一操作。在正常情况下，需要给这两个结点分别分配一块内存。

但是在ggml计算图优化下，如果满足下面的条件：
- a不是来自外部的张量（由其他上下文分配，或者用户显式指定的张量，例如模型权重，如果允许修改则会破坏其他数据），
- a不作为后续输出（如果作为输出，则张量需要被保留），
- a和b的张量布局相同，
- a的子结点只有b，而且不作为其他任何张量的视图原张量，
- a到b的计算过程是支持inplace替换的，

那么b的空间就可以复用a的空间。

复用的结果是a和b指向同一片空间，a计算完了后，b直接在同一片空间写入结果，避免a只被b所利用，但是却一直占着空间，导致内存利用效率低。所谓的“父节点复用”实质上就是对于某些计算的中间结点，只在下一步的计算中使用到，没有必要在后续的计算中继续占用一块存储空间，因为之后不会再用到了。

在计算图**逻辑**上，a、b都存在，对应的两个ggml_tensor也仍然存在，只是它们使用的是同一块内存空间。

现在我们把目光放到整个计算图上，一个时刻在进行计算某一个node，只涉及该node和该node所依赖的nodes，其他的结点是不需要用到的。如果把计算图中的每个结点都单独分配一段空间来存储，在计算的时候会有大量的存储空间处于空闲状态。

在意识到不必同时激活所有张量后，就可以自然地推导出：缓冲区大小可以小于整体计算图的大小，当一部分结点的数据已经传递下去，结点自身的数据不需要再使用时，这些结点再占用存储空间是没有意义的，这些空间可以给其他张量使用。而还有很久才会计算到的结点，现在就放到内存中也是没有意义的。

也就是说当结点不再起作用时，或者说tensor的生命周期终结时，它所占有的空间可以被重新利用。如下图所示：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202604061936328.png)

那么在预分配的时候，结点node 0、node 1和结点node 4、node 5地址是一样的。这意味着，在reserve函数里需要根据计算图结点的拓扑排序依次处理结点，每处理完一个结点就把其父节点的依赖数减1，减到0后这个父节点对应的地址就可以被后面的结点利用了。

在实际实现中，它先将叶子结点和用户显式指定保护（指定为input）的结点申请好，这部分的空间是不动的，也不会被复用。其余结点就按照上面说的思路进行内存空间的分配。

在具体实现的时候，新定义的一个结构体来表示计算图上的结点，用哈希表建立从ggml_tensor到该数据结构的访问通路，结构体如下所示：
```cpp
struct hash_node {
    int n_children;
    int n_views;
    int buffer_id;
    struct buffer_address addr;
    bool allocated;
};
```

n_children表示有多少结点是本结点的子节点，在计算图中，有多少结点的计算依赖本结点
n_views表示本结点是多少结点的视图

为什么要新建一个结构体？原因是gallocr不直接修改ggml_tensor，在申请空间的时候，是在模拟计算图计算流程，上面的这些属性是动态变化的。虽然计算图已经统计好了结点间的连接关系，这里把计算图定义和内存分配的两个功能分开，不要混淆在一起。

### Backend scheduler

Backend scheduler是ggml实现异构计算的核心

一个`ggml_backend`，对应一个vbuffer。

维护了一个ggml_tensor到backend的哈希表，同时支持跨后端和流水线并行的张量复制：
```cpp
// hash map of the nodes in the graph
struct ggml_hash_set  hash_set;
int                 * hv_tensor_backend_ids; // [hash_set.size]
struct ggml_tensor ** hv_tensor_copies;      // [hash_set.size][n_backends][n_copies]

#define hash_id(tensor) ggml_hash_find_or_insert(&sched->hash_set, tensor)
#define tensor_backend_id(tensor) sched->hv_tensor_backend_ids[hash_id(tensor)]
#define tensor_id_copy(id, backend_id, copy_id) sched->hv_tensor_copies[(id) * sched->n_backends * sched->n_copies + (backend_id) * sched->n_copies + (copy_id)]
#define tensor_copy(tensor, backend_id, copy_id) tensor_id_copy(hash_id(tensor), backend_id, copy_id)
```

n_copies和流水线并行支持有关

记录计算图上各节点都存储在哪个后端上：
```cpp
int * node_backend_ids; // [graph_size]
int * leaf_backend_ids; // [graph_size]

int * prev_node_backend_ids; // [graph_size]
int * prev_leaf_backend_ids; // [graph_size]
```
prev用于存储上次图分配的结果，当当前计算图节点后端分配结果与之前的分配结果不同时，会重新申请计算图。

Backend scheduler的核心是计算图分割：
```cpp
// graph splits
struct ggml_backend_sched_split * splits;
int n_splits;
int splits_capacity;
```

对外接口：
- `ggml_backend_sched_alloc_graph`，先后调用下面两个函数：分割计算图+分配空间
- `ggml_backend_sched_split_graph`分割计算图
- `ggml_backend_sched_alloc_splits`判断节点分配后端是否有变化，如果有变化就通过gallocr重新分配空间。

流水线并行支持