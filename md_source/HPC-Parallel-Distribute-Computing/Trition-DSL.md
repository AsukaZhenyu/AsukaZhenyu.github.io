# OpenAI Triton DSL

微架构设计、编译器、操作系统三者是紧密相连的，Triton不仅是DSL，更是重要的编译技术，对于小白直接去写CUDA代码效果还不如Pytorch编译后端生成的代码。但是这里先不涉及编译理论，聚焦于Triton的使用。

OpenAI的Triton是介于PyTorch和纯手工CUDA之间的、用于优化AI算子的中间层解决方案。Triton作为一种特定领域语言，旨在简化开发，实现易用性和通用性，在让开发者用Python快速编写高性能Kernel。有第三方提供的[Triton-Puzzles](https://github.com/gpu-mode/Triton-Puzzles)项目供学习使用。