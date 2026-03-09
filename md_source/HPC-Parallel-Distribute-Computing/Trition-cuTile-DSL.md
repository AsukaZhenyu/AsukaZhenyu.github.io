# DSL特定领域编程语言

微架构设计、编译器、操作系统三者是紧密相连的，Triton不仅是DSL，更是重要的编译技术，对于小白直接去写CUDA代码效果还不如Pytorch编译后端生成的代码。但是这里先不涉及编译理论，聚焦Triton和CUTLASS的使用。

OpenAI 的 Triton 和 NVIDIA 的 CUTLASS（及其核心组件 CuTe） 是介于 PyTorch 和纯手工 CUDA 之间的、用于优化 AI 算子的中间层解决方案。Triton 作为一种特定领域语言，旨在简化开发；而 CuTe 作为 CUTLASS 内部的模板抽象，提供了对数据布局和内存访问的精细控制。