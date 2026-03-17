# llama-model代码阅读

[toc]
<br/>

在阅读源码之前，如果对大型C++项目的组织不熟悉，可以看看[C++项目构建与CMake简介](../Linux/CMake.md)，如果对现代C++的一些语法不太熟悉，可以看看[llama.cpp源码阅读笔记](../Effective-C++/llama.cpp-reading-note.md)，如果对现代LLM的组件和优化算法不熟悉，可以看看[混合专家模型](../AI-Model-Optimize/MoE-Optimize.md)、[RoPE和YaRN](../AI-Model-Optimize/RoPE-YaRN.md)、[投机解码](../AI-Model-Optimize/Speculative-Decoding.md)。

## llama-model.h的依赖关系图
第一行为文件名（或者一系列文件名，例如qwen.cpp、qwen2.cpp、qwen2moe.cpp就只写一个qwen了），第二行为文件路径，第三行为备注。

// 下图有更新
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603091922891.png)






