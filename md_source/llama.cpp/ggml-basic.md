# GGML基础

[toc]
</br>

## ggml structure

llama.cpp能够支持众多硬件/后端，其核心在于ggml库。

发现一个好东西：[DeepWiki](https://deepwiki.com/ggml-org/ggml)，对于GitHub上开源的仓库，它有AI自动生成的图文并茂的Wiki，并且会随项目更新而更新Wiki内容，可以先看wiki熟悉项目结构，而且有LLM聊天框，可以询问项目的一些细节，不需要登陆，对话你可以通过保存网页后续重复访问。这就非常方便了，不像我之前先git clone下来用Claude Code分析项目文件，虽然效果差不多，但是API贵啊，随便弄弄大几百就没了，有免费的为什么不用。

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

在llama.cpp代码中涉及到backend（后端），通常指的是硬件后端（CPU、CUDA），这里的buffer指针告诉系统，张量的存储位置（CPU的DRAM？还是GPU的HBM）

ne和nb表示张量各个维度的长度（定义张量的形状）、在各个维度上走一步需要移动多少byte（不同类型的张量，每单个数据占的字节数也不一样，不同张量的形状也不一样），这里有点像[SIMD](../NVIDIA/NVIDIA-GPU-Arch.md)里的`VLEN`和`VSTR`。最近在微信公众号上看到一篇介绍[CuTe](../HPC-Parallel-Distribute-Computing/CUTLASS-CuTe-DSL.md)的Layout代数的文章（微信搜索zartbot layout），内容也有点像，但限于我的数学水平看不懂。

op表示得到当前张量进行的运算是什么，SRC表示由哪些张量运算得到当前张量。也就是说SRC数组指针指向的张量们经过op运算得到当前张量。

当当前张量为某个张量的视图张量时，也就是说当前张量是某个张量的切片时（类似python中cur = src[:,::5]），view_src指向源张量，view_offs表示相对源张量的偏移量。不需要拷贝可以直接用。

data指针指向数据真正存放的地址。

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

这里的计算图也是非常的轻量，几个int变量记录计算图结点数量信息，其余的都是一些指针，还有一个哈希表记录结点的访问情况。

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

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202604011955227.png)

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

在`ggml-backend-reg.cpp`里实现的是多个后端的注册，这里就涉及不同后端，即不同硬件架构、编程模型之间协调，看代码会发现有很多`#ifdef GGML_USE_CUDA`这样的宏处理语句。

这里简单分析一下注册表要分两个文件实现的原因，reg实际上定义的是所有后端统一的规范接口形式，registry实际上做的是适配不同种后端的情况，并且需要通过dl动态加载不同后端对应的动态库（例如：CUDA runtime库），前者偏商务，后者偏运动。

核心结构体是：`ggml_backend_registry`，代码大部分是遍历/获取后端/设备，理解了上面后端与设备之间的关系就很好理解了。

总结一下：类`ggml_backend_reg`管理单个后端内的多个设备，类`ggml_backend_registry`管理所有的后端和设备。

### Device and Stream

**Device**

这里涉及一个设计模式：
$$
Device \rightarrow Context \rightarrow Stream
$$

在一个计算设备中，里面包含不同的执行上下文（Context），在一个上下文下又有多个执行流（指令流/Stream），也就是说从硬件到执行会有这么几个层次。

在学习操作系统进程部分时应该了解到，进程的组成部分包括：进程控制块（PCB）、程序段和数据段。在PCB中包含了进程的属性与进程的上下文信息（寄存器值、PC位置、堆栈指针）。也可以按照进程来理解，下面说的一大堆本质上就是：进程申请、进程间同步。

这里我想表达的是：一个device会有很多stream，对应到backend设计中呢，就是一个`ggml_backend_device`（设备）对应多个`ggml_backend`（操作流/进程），在看`ggml_backend`结构体属性时有一个属性是：

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

到这里，整个ggml的后端结构已经被我们揭示清楚了，一个推理系统可能有多个后端，一个后端可能有多个设备，每个设备上运行着多个执行流，这些执行流直接执行计算图。而且在编程时我们接触到的可能就是执行流`ggml_backend`相关的接口，因为在前端我们就是通过定义LLM Archs的静态计算图来描述LLM inference计算的。

### Buffer and Memory alloc

要理解buffer type和buffer相关的代码，需要结合`ggml-alloc.h/.c`两个文件一起。