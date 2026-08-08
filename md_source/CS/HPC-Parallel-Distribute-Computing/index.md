本部分关注高性能计算（HPC），在我的理解中HPC就是针对具体硬件架构/计算架构（CPU、GPU、FPGA、异构、分布式）、任务/算法（LLM训练/推理、科学计算）和需求/指标（吞吐量/延迟/可扩展性/能耗）去做优化/tradeoff。

更具体地，内容包括：单机单卡上计算流程（NVIDIA的SIMT架构GPU存算优化）、单机多卡上的计算流程（CPU-GPU异构计算优化，多卡GPU并行）、多节点计算流程（分布式计算的通信、同步），核心是了解计算、存储、通信特征，设计计算流程，充分利用计算资源。

<hr> 
<h2>Parallel & Distributed Computing and High-Performance Computing</h2>

<posts-list>

<title-link> 
css_source/main_style.css
Fundamentals of Distributed Computing for DNN,深度神经网络分布式计算基础
[2026-4-8](./DNN-Distribute-basic.md)
</title-link>

<title-link> 
css_source/main_style.css
Overview of Parallel Computing DSLs,并行计算DSL概述
[2026-3-27](./parallel-DSL-Overview.md)
</title-link>

<title-link> 
css_source/main_style.css
Triton Syntax Notes,Triton语法笔记
[2026-5-21](./Trition-DSL.md)
</title-link>

<title-link> 
css_source/main_style.css
CuTe Syntax Notes,CuTe语法笔记
[2026-3-27](./CUTLASS-CuTe-DSL.md)
</title-link>

</posts-list>