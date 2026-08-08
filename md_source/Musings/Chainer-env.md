# Chainer环境配置


之前在做老师的一个项目，这个项目是老师在东京大学做博后的项目。代码基于Chainer框架，在配环境的时候遇到了一点困难。在CSDN上几乎搜不到解决方法，环境配起来也比较复杂，于是记录一下。

首先Chainer依赖于CuPy，当时使用的是Chainer v7系列，找到对应CuPy推荐版本为 CuPy v7.8.0
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252058092.png)

经过多次实验，只有CuPy v7.8.0能够正常工作，其他的都不行。要下载CuPy v7.8.0，对CUDA版本又有要求

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252058090.png)

可以看到只有CUDA8.0或者CUDA9.1版本支持，CuPy v7.8.0。经过实验CUDA9.1版本下载不了，只能在CUDA8.0版本下面下载。可以看到着一层又一层的依赖关系确实比较复杂，而且CUDA版本又太古早，autodl上最低好像只支持到CUDA11.3，这意味着需要我们自己在服务器上下载对应版本的CUDA和CUDA toolkit，相应版本的CUDA和CUDA toolkit下载又对python版本有要求，对包安装的顺序有要求，对包安装的命令有要求，当时摸索了很久才找到一个成功的环境配置方法。相比起来还是安装pytorch要简单多了。

首先将源改为清华源，autodl默认是阿里源，在阿里源下有些包下载不下来。

进入autodl终端：
```bash
vim ~/.bashrc
```
输入i开始编辑，可以用鼠标滚轮滚到最后一行插入：
```bash
source /root/miniconda3/etc/profile.d/conda.sh
```
按下ESC，输入`:wq`保存并退出

回到终端后输入`bash`刷新。上面这些步骤是autodl里使用conda必须的流程。

新建环境
```bash
conda create -n BICTRNN python==3.6
```
这里python的版本必须是3.6，否则cuDNN不能下载。

进入环境：
```bash
conda activate BICTRNN
```
接下来按顺序操作，否则可能会发生“找不到包”或者“包冲突”的问题。

先下载cupy：
```bash
pip install cupy-cuda80
```
再下载cuDNN：
```bash
conda install caffe2::caffe2-cuda8.0-cudnn7
```
然后cudatoolkit：
```bash
conda install cudatoolkit==8.0
```
最后下载chainer：
```bash
pip install chainer
```

这样就成功安装好了Chainer，能够使用CuPy进行加速了。接下来根据项目安装其他包即可。

关于GPU租用：
可以选择租用4090，镜像就选择miniconda,python 3.8（之后创建环境时python==3.6这两者并不冲突）,cuda 11.3（40系显卡cuda版本要求大于等于11.3）没有问题，cuda是向下兼容的，下载8.0的cudatoolkit是没有问题的。

最后是一些训练经验：
一张卡其实可以开多个终端训练代码，观察监控里的GPU占用率，显存占用率，自己新建终端运行代码即可。这样可以省钱。