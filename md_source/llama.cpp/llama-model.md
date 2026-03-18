# llama-model代码阅读

[toc]
<br/>

在阅读源码之前，如果对大型C++项目的组织不熟悉，可以看看[C++项目构建与CMake简介](../Linux/CMake.md)，如果对现代C++的一些语法不太熟悉，可以看看[llama.cpp源码阅读笔记](../Effective-C++/llama.cpp-reading-note.md)，如果对现代LLM的组件和优化算法不熟悉，可以看看[混合专家模型](../AI-Model-Optimize/MoE-Optimize.md)、[RoPE和YaRN](../AI-Model-Optimize/RoPE-YaRN.md)、[投机解码](../AI-Model-Optimize/Speculative-Decoding.md)。

## llama-model.h的头文件依赖关系图
第一行为文件名（或者一系列文件名，例如qwen.cpp、qwen2.cpp、qwen2moe.cpp就只写一个qwen了），第二行为文件路径，第三行为备注。

// 下图有更新
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603091922891.png)

## model.h

model.h文件主要分为两个部分，前半部分为基础类：`Mamba`、`Delta Net`（卖点似乎是线性注意力）、`RWKV6`、`RWKV7`的基础模型类。

后半部分是定义各个模型的接口（DeepSeek、QWen、MiniMax等），有一些类继承上面的`Mamba`基础模型（例如：`llm_build_falcon_h1`），有一些类继承`Delta Net`基础模型（例如：`llm_build_kimi_linear`），有一些类继承`RWKV6`基础模型（例如：`llm_build_rwkv6qwen2`），有一些类继承`RWKV7`基础模型（例如：`llm_build_rwkv7`），其他的类都是直接继承自`llm_graph_context`，值得注意的是上述各基础模型也是继承自`llm_graph_context`，相当于一些特殊架构的LLM模型在中间多了一层类的抽象。

在model.h的接口声明里，所有模型的构造函数都只要两个参数：
```cpp
(const llama_model & model, const llm_graph_params & params)
```

除了mamba、delta net、gemma3（会加一些共有属性和方法），其余的类都基本上只有一个构造函数，或者再加上一些私有属性。在对应的`.cpp`文件就是实现这个构造函数。

所以在其他文件重点关注三个类：`llm_graph_context`、`llama_model`、`llm_graph_params`

## llama-model.h

在llama-model.h文件类，最主要就是定义了结构体`llama-model`。在llama-model.h里定义的结构体之间的关系如下图所示：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603172149615.png)

上面四个层就是一些`ggml_tensor`，中间的`llama_layer`也是一些`ggml_tensor`再加上上面四层。


