# Nsight System工具

NVIDIA Nsight是一组工具包，下面举几个例子：
|名称|用途|安装方式|
|-|-|-|
|Nsight System|系统级性能分析，提供CPU和GPU活动的时间线视图，识别宏观性能瓶颈|从 NVIDIA 官网下载独立安装包|
|Nsight Compute|CUDA Kernel 性能分析，提供详细的SM（流多处理器）效率、内存吞吐量等微观指标|随 CUDA Toolkit 一起安装|
|Nsight Graphics|图形应用程序调试与分析，支持Direct3D、Vulkan等图形API|从 NVIDIA 官网下载独立安装包|

我的主力机型是win11操作系统，而Nsight System在WSL上似乎有已知bug，配置起来非常复杂，

NVIDIA相关技术栈：

NVIDIA驱动，直接在GPU硬件之上，没有驱动就用不了GPU

CUDA（Compute Unified Devices Architectured，统一计算架构），NVIDIA 推出的并行计算平台和编程模型。它允许开发者直接利用 GPU 内部的数千个核心进行通用计算。它是一套抽象的指令集架构（ISA）和编程接口。

CUDA Toolkit，NVIDIA 提供的开发工具包。包括：CUDA 编译器（NVCC）、CUDA 运行时库、开发与调试工具。

cuDNN（CUDA 深度神经网络库），NVIDIA 专为深度学习设计的底层加速库。