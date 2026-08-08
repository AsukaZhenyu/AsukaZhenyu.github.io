# 在llama.cpp的src之外

llama.cpp是我第一个看源码的开源项目，所以有很多东西感觉很新鲜没见过。可能会涉及一些开源项目社区规范、一些工具/技术栈。

## Emscripten

Emscripten是一个工具链，主要把C/C++代码编译为WebAssembly（WASM/Wasm），可以在网页浏览器里高效运行。

可以把C++代码转化为JavaScript中调用的模块，在网页上实现原生的性能。

WebAssembly的动态链接支持还不完善，目前主要依赖静态链接。

## Windows上的MinGW

社区默认静态链接更适合MinGW（Minimalist GNU for Windows），MinGW默认静态链接`libstdc++.a`和`libgcc.a`，而且MinGW只动态链接`msvcrt.dll`，而这个动态库在几乎所有的Windows操作系统都会安装。

C++运行时库并不是Windows操作系统的组成部分，微软自己的Visual C++运行时（如 msvcp140.dll）需要单独分发和安装，不同版本的VC++运行时互不兼容。MinGW的运行时库libstdc++-6.dll、libgcc_s_seh-1.dll）同样没有预装在Windows中。如果MinGW程序动态链接这些库，那么目标用户就必须手动安装对应的DLL，或者开发者必须将这些DLL与.exe一起打包。这无疑增加了分发成本和用户的使用门槛。

而且Windows用户很少会同时运行多个MinGW编译的程序，动态链接的共享优势在MinGW场景下几乎不存在。

但是GNU在Linux上、MSVC在Windows上都是默认支持动态链接的。

## BLAS、SYCL、MUSA、HIP、Vulkan、CANN、ZenDNN、KleidiAI、OpenCL

在阅读如何构建llama.cpp时发现，对于不同的后端构建方式完全不一样，在读的过程中发现有很多后端我完全没有概念。

针对我的情况，需要用NVIDIA GPU加速，所以我应该按照CUDA那一章节去构建llama.cpp，要是看到CPU构建后面的东西看不懂就没往下看那就完蛋了。而且构建也支持多后端，在使用时可以指定使用后端设备，并且在编译过程中可以构建动态库，还有各种编译选项，还是先通读一遍，都了解了解再本地构建吧。

我希望做CPU-GPU异构计算，这就涉及多后端Dynamic Loading，CPU端和CUDA端都需要了解并使用。

在llama.cpp中，后端指的是：硬件架构的抽象层

MUSA针对摩尔线程GPU加速
HIP针对AMD的GPU加速
Vulkan在我印象里是图形API，怎么也和设备/后端想关联呢？这里可以使用vulkan管理跨平台GPUs。
CANN针对华为昇腾NPU
ZenDNN针对AMD EPYC™ CPUs进行优化
KleidiAI 是一个专为 AI 工作负载设计的优化微核库，专门针对 Arm CPU 进行了优化。这些微核能够提升性能，并可由 CPU 后端启用使用。