# llama.cpp源码阅读笔记

[toc]
<br/>
本文记录一下，我在阅读llama.cpp源码时，不太熟悉的C++用法。

## 前向声明

前向声明通常和指针/引用配合使用，例如在llama-model.h里第17行：
```cpp
struct llama_cparams;
```
这里的结构体llama_cparams在llama-cparams.h里有完整定义，但是在llama-model.h里没有include这个文件，在这里只是声明有这么一个结构体。
在llama-model.h里第555行声明结构体llama_model里的成员函数时，llama_cparams作为引用出现在函数参数里：
```cpp
float get_rope_freq_scale(const llama_cparams & cparams, int il) const;
```

但是在llama-model.cpp里第8192行实现该成员函数时：
```cpp
float llama_model::get_rope_freq_scale(const llama_cparams & cparams, int il) const {
    return hparams.is_swa(il) ? hparams.rope_freq_scale_train_swa : cparams.rope_freq_scale;
}
```
需要使用结构体llama_cparams的定义/实现代码，所以在llama-model.cpp第5行include了llama-cparams.h文件：
```cpp
#include "llama-cparams.h"
```

在前向声明中，编译器没有拿到该类/结构体的实现，因此不知道该类/结构体的大小，更不能创建该类型的对象，或者访问任意成员。

但是引用只是别名，其大小已知（指针的大小也是固定的），所以编译器只需要知道这个类型存在，就能声明指向它的引用或指针。

前向声明可以减少编译依赖，缩短编译时间。如果两个类互相引用时，也可以用前向声明打破循环依赖。（在Stanford CS144 check0作业代码minnow里byte_stream.hh的接口实现有这个例子）

对于`llama-model.cpp`而言，`llama-model.h`在这里隐藏实现好像有点脱裤子放屁，但是对于其他的`.cpp`文件要引用`llama-model.h`却不涉及`llama_cparams`结构体实现的，则是节省了大量编译资源。减少头文件依赖，确实会让整个项目的编译负担减轻。

## extern “C”

在llama.cpp项目文件里，通常会遇见很多自定义的类型名。几乎随便打开一个文件查看接口设计或者函数实现，会发现函数参数类型通常是`llama_xxx`、 `ggml_xxx`、 `llm_xxx`等。其中有部分是在各文件里自定义的结构体，有一些会跳转到`ggml.h`或者`llama.h`里自定义的枚举类/结构体，这时候会发现这些定义被包裹在下面的结构里：
```cpp
#ifdef  __cplusplus
extern "C" {
#endif
/*
枚举类
结构体
*/
#ifdef  __cplusplus
}
#endif
```
`__cplusplus`宏只有在cpp编译器（或者强制设置为cpp模式）的情况下才会被设定，这一段的意思是，如果使用cpp编译器处理，在这大段声明之外用`extern "C"{}`包裹，表示这一段代码用c编译器处理，如果使用c编译器就直接处理。

为什么要用C，因为C风格结构体内存规律，枚举类的本质就是枚举整数，ABI稳定。C++会有额外开销，而且不同C++编译器的处理方式不一样。为了稳定性和方便调用。

## include路径

在阅读代码的时候可能会产生疑惑，为什么/src/llama-model.h，能通过`#include "llama.h"`直接导入/include/llama.h。答案可能比想象中的简单，这是因为CMakeLists里有相关指令可以找到。在/src/CMakeLists.txt里第160行：
```CMakeLists
target_include_directories(llama PUBLIC ../include)
```

## using的作用范围
