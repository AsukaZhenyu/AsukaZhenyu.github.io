# pytorch架构

[toc]
</br>

pytorch通常有两种用法：
- 替代numpy的张量运算库，充分利用GPU进行张量计算
- 深度学习研究平台，兼顾灵活性和运行效率

pytorch包自带了CUDA runtime库（CUDA运行时库）和cuDNN的二进制文件（CUDA深度神经网络库），使用的话只需要安装NVIDIA的驱动，非常方便。但是pytorch包大也是真的大，随随便便就要下载2.5G。

不过这里不关注pytorch如何使用，例如：数据集如何加载，模型如何声明、训练、保存、推理。

本文关注的是：pytorch的执行模式；pytorch如何自带跟踪张量、建立计算图、自带求导；pytorch如何编译优化计算图、IR。

[参考资料](https://docs.pytorch.org/tutorials/)

## pytorch的执行模式

在pytorch的github仓库的README里面有一句话：
>PyTorch is not a Python binding into a monolithic C++ framework. 

这句话的翻译是：pytorch不是把python绑定到庞大的C++框架中去。

含义是：不是单纯的把python当成胶水语言，调用一个庞大的C++库去进行计算。换句话说，pytorch框架的设计不是简单的“通过python调用C++计算库”。当然仅仅解释到这里还是无法理解它为什么这么强调，这么做的好处是什么。

在README中还说明了pytorch的“命令式体验”，敲一行代码就会执行一行。每执行一行代码，PyTorch 会逐行、立即执行所有操作。每一个运算（如卷积、加法）都会马上调用底层的 C++ 或 CUDA 实现，计算出结果并返回 Python 对象。计算图是在运行过程中隐式构建的（用于自动微分）。

传统的DNN计算框架属于静态计算框架，一个模型被定义好了之后，其执行代码就固定了，如果要修改则需要重新构建计算图。

有点类似于编译器和解释器的区别，编译器将代码的各个部件编译链接为一个庞大的静态的可执行文件，每次修改一个部分都需要重新编译和构建可执行文件。解释器可以一行一行执行代码，解释器有着编译器难以做到的灵活性。

当然pytorch如此设计的优点和缺点也和解释器相对于编译器的优缺点相似，pytorch的优化思想也和解释器优化思想类似——通过JIT编译提升代码执行效率。本节将分两个部分介绍pytorch的执行模式，第一部分就是类似python解释器的即时执行模式，第二部分就是编译优化。

### 即时执行模式（Eager Execution）

这是 PyTorch 从早期版本就采用的核心运行方式，也是它得名“动态图框架”的原因。当然如果详细了解过的话，pytorch并不是最早的“动态图框架”。2015年日本的Preferred Networks（PFN）公司开源了Chainer框架，Chainer最早定义了深度学习的动态图模式，并且使用CuPy加速张量运算。我进入大学后做的第一个深度学习项目就是基于[Chainer](../Musings/Chainer-env.md)框架的。

### 编译执行模式（torch.compile）

从 PyTorch 2.0 开始引入，旨在保持灵活性的同时，大幅提升运行性能。