# NVIDIA CuTe DSL

NVIDIA的`CUTLASS`是构建在`CUDA`之上的一个专业库。`CUTLASS`是一个头文件库，在写`CUDA`程序的时候通过`#include`直接使用。`CuTe`作为`CUTLASS`的核心组件，从`CUTLASS 3.0`开始引入，`CuTe`是一套用C++实现的、用于灵活描述和操作内存中数据布局（Layout）和张量（Tensor）的抽象工具，是CUTLASS实现复杂优化的基石。

从`CUTLASS 4.0`开始，官方提供了一个用Python编写高性能Kernel的接口——[CuTe DSL](https://docs.nvidia.com/cutlass/latest/media/docs/pythonDSL/overview.html)，性能略逊于`CUTLASS C++`，但是易用性、开发效率更高，学习曲线更平缓。`CuTe DSL`仍然是贴近`NVIDIA SIMT GPU`的底层编程模型，与 `CuTe C++` 抽象层完全一致——它暴露了布局（Layouts）、张量（Tensors）、硬件原子操作（Hardware Atoms）等核心概念，并赋予开发者对硬件线程与数据层级结构的完全控制权。