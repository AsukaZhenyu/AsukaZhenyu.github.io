<h2>GPU、NPU软硬件架构</h2>

以NVIDIA的GPU硬件架构与CUDA编程模型为学习的核心，辅以AMD的GPU硬件架构和ROCm编程模型、HIP编程接口，摩尔线程GPU架构和MUSA编程模型，做为GPU架构迁移能力训练。

以华为昇腾NPU硬件架构和Ascend C为学习的另一个核心，代表与GPU的Thread编程模型与SIMT调度不同的加速器设计思路，对张量数据显示Tiling和搬运。这两种思想对于现代加速器来说都很重要，NVIDIA GPU的Tensor core，昇腾351x架构的SIMT硬件和Wrap调度器，表明GPU、NPU正在互相吸收对方的思想。

1. hardware architecture
2. Execution Model and Scheduling
3. Memory Hierarchy
4. Data Movement and Layout
5. 同步与内存一致性 Synchronization
6. Kernel + Runtime 编程
7. Compiler / ISA
8. 性能模型与软件调度
9. Profiling / Debugging
10. 系统级能力
11. Representative Workloads（Reduction、GEMM、Softmax、Attention、MoE）

<posts-list>

<title-link> 
css_source/main_style.css
NVIDIA GPU Architecture,英伟达GPU架构
[2026-2-26](./NVIDIA-GPU-Arch.md)
</title-link>

<title-link> 
css_source/main_style.css
NSYS Performance Analysis,NSYS性能分析
[2026-4-10](./Nsight-System.md)
</title-link>

</posts-list>