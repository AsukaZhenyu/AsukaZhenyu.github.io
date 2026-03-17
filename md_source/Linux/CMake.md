# C++项目构建与CMake简介

[toc]

## C++编译流程

### 预处理阶段
首先要说的是，所有的`#include`都只包含`.h`文件，无论是`.cpp`文件还是`.h`文件都只会包含`.h`文件。在`xxx.cpp`中还会包含自己对应的`xxx.h`（大部分cpp实践下都是这样，cpp本身没有规定`#include`的文件后缀，cpp本身就是以危险的灵活性换取高性能）

`#include`的两种形式：
- `#include <xxx.h>` 编译器直接去系统目录去找头文件
- `#include "xxx.h"` 编译器先在当前文件夹去找，然后再去系统目录里找

系统目录由编译器自己决定，用于查找头文件，可以用下面的命令查看：
```bash
lzy@liuzhenyu:~$ gcc -E -v -xc /dev/null 2>&1 | grep '^ '
 /usr/libexec/gcc/x86_64-linux-gnu/13/cc1 -E -quiet -v -imultiarch x86_64-linux-gnu /dev/null -mtune=generic -march=x86-64 -fasynchronous-unwind-tables -fstack-protector-strong -Wformat -Wformat-security -fstack-clash-protection -fcf-protection -dumpbase null
 /usr/lib/gcc/x86_64-linux-gnu/13/include
 /usr/local/include
 /usr/include/x86_64-linux-gnu
 /usr/include
```

注意不要和操作系统路径混淆，即OS用于查找可执行文件的路径，可以用下面的命令查看操作系统目录：
```bash
lzy@liuzhenyu:~$ echo "$PATH" | tr ':' '\n'
/usr/local/sbin
/usr/local/bin
/usr/sbin
/usr/bin
```

`.h`文件声明接口，`.cpp`实现接口，在预处理阶段会把所有`#include`的`.h`文件的文本复制到`.cpp`文件，并且会递归复制，把所有要用到的头文件声明都复制到该`.cpp`文件中。

所以在`abc.h`文件中`#include`的`.h`文件不需要在`abc.cpp`文件里重新`#include`，在后续编译中只有`.cpp`会编译，`.h`文件被预处理展开到`.cpp`文件里一起编译。每个`.cpp`文件是单独编译的，不会相互干扰。我认为这是理解C++项目编译的核心，理解了这个才能理解为什么头文件要去重，在什么情况下去重，为什么要链接。

考虑这样一个项目结构：
```bash
~/cpp-program
├── main.cpp #include "func.h"
├── func.cpp #include "func.h"
└── func.h
```
在预处理展开的时候`func.h`被展开了两次，分别在`main.cpp`和`func.cpp`里编译了两次。这是必要的，在`func.cpp`和`main.cpp`中，必须要`func.h`中定义的接口才能编译（否则，未定义的结构体/类/函数等）。在编译过程中，各`.cpp`文件是分开编译的。

考虑这样一个项目结构：
```bash
~/cpp-program
├── main.cpp #include "x.h" #include "y.h"
├── x.cpp
├── x.h #include "common.h"
├── y.cpp
├── y.h #include "common.h"
├── common.cpp
└── common.h
```
此时`common.h`在`x.h`和`y.h`分别展开了一次，而在`main.cpp`里`common.h`被展开了两次，这就会造成重复！在`main.cpp`编译的过程中，会浪费编译资源，并且如果`common.h`内有非内联的函数实现，在编译过程中会有重复定义报错。

关键是：**头文件展开可以在不同cpp文件里重复，这是预期的必要行为，但是单一cpp文件展开时不能有重复展开的头文件**

防止多次`#include`有一些解决方法：
- #ifndef

如下面的代码块例子所示：
```cpp
// example.h
#ifndef EXAMPLE_H // 自定义的宏
#define EXAMPLE_H

/*
头文件内容
*/

#endif
```
在某`.cpp`文件的预处理过程中，第一次展开到该头文件，还没有定义`EXAMPLE_H`的宏，其内部的头文件内容就被正常展开。第二次及以后遇到该头文件，由于已经定义了`EXAMPLE_H`的宏，这部分内容就会被直接跳过，防止重复展开。

- #pragma once 更现代的选择

直接在头文件开头加上这一句就可以了，这是非标准但是广泛支持的指令，直接告诉编译器，本文件只应该被包含一次。更加简洁，且不需要自己维护宏名。
```cpp
// example.h
#pragma once

// 头文件实际内容
```

---

如果你阅读过GAMES101、Stanford CS144、llama.cpp的源码，你会发现有些时候，会在`.h`的接口设计中，直接把一些简单的函数“实现”了。

这是因为类内函数默认是内联（inline）函数，要在`.h`文件里实现函数，只能是内联函数，对于简单函数（无循环、分支），简短函数（3行左右），使用内联函数能有效提升性能。

好的，现在给出预处理的正式定义：
>预处理器是在程序源文件被编译之前根据预处理指令对程序源文件进行处理的程序。预处理器指令以#号开头标识，末尾不包含分号。预处理命令不是C/C++语言本身的组成部分，不能直接对它们进行编译和链接。C/C++语言的一个重要功能是可以使用预处理指令和具有预处理的功能。C/C++提供的预处理功能主要有文件包含、宏替换、条件编译等。

### 编译与汇编
各`.cpp`文件经过预处理后，变成`.i`(C语言)`.ii`(C++)文件，先经过编译后变成`.s`汇编代码文件，再经过汇编生成`.o`二进制文件。

### 链接
在上文提到`.h`声明接口，`.cpp`实现接口，在预处理阶段只是将接口展开，实际执行的时候找不到对应的实现。

由于各`.cpp`文件是分开编译的，经过编译和汇编后生成的是一个个不知道对方如何实现的二进制`.o`文件，那这是无法执行的。

链接过程简单来说，把之前编译产生的所有.o目标文件，以及程序依赖的库文件“粘合”成最终可执行文件的过程。

链接分两步：
- 符号解析：链接器分析所有`.o`文件，明确各个`.o`文件需要哪些函数实现，给出哪些函数实现。建立一个全局的符号表，确保所有`.o`文件的需求都能找到对应的实现，每个实现只被给出一次。
- 重定位：当所有符号引用都找到了对应的定义后，链接器就开始进行地址修正。它会为代码和数据分配最终的运行时内存地址，并修改所有指令中的地址引用，让它们指向正确的位置

链接的对象：
- 二进制目标文件`.o`
- 静态库`.a`、`.lib`
- 动态库`.so`、`.dll`

动态库与静态库：
>静态链接库与动态链接库都是共享代码的方式。静态库可以简单看成是一组目标文件（.o/.obj文件）的集合，即很多目标文件经过压缩打包后形成的一个文件。静态库特点总结：
静态库对函数库的链接是放在编译时期完成的，运行时不会再进行链接。
程序在运行时与函数库再无瓜葛，移植方便。
浪费空间和资源，因为所有相关的目标文件与牵涉到的函数库被链接合成一个可执行文件。
静态库对程序的更新、部署和发布也会带来麻烦。如果静态库更新了，所有使用它的应用程序都需要重新编译、发布给用户。

>动态库在程序编译时并不会被链接到目标代码中，而是在程序运行是才被载入。不同的应用程序如果调用相同的库，那么在内存里只需要有一份该共享库的实例，规避了空间浪费问题。动态库在程序运行时才被载入，也解决了静态库对程序的更新、部署和发布带来的麻烦。用户只需要更新动态库即可，增量更新。
1、 动态库把对库函数的链接载入推迟到程序运行的时期。
2、 可以实现进程之间的资源共享。（因此动态库也称为共享库）
3、 将一些程序升级变得简单
4、 甚至可以真正做到链接载入完全由程序员在程序代码中控制（显示调用）。

链接分两种：
>静态链接：在链接阶段，会将汇编生成的目标文件.o与引用到的库一起链接打包到可执行文件中，程序运行的时候不再需要静态库文件。

在静态链接中，最终生成的可执行文件`.out`、`.exe`包括目标文件`.o`和静态库`.a`、`.lib`，在操作系统的视角，如果有多个进程运行不同的可执行文件，这些可执行文件引用了相同的静态库，在内存中会有多份静态库代码，分布在不同可执行文件中。这会导致空间浪费。

>动态链接：把调用的函数所在文件模块（DLL）和调用函数在文件中的位置等信息链接进目标程序，程序运行的时候再从DLL中寻找相应函数代码，因此需要相应DLL文件的支持。


灰色部分文字[来源](https://github.com/selfboot/CS_Offer/blob/master/C%2B%2B/Compiler.md)

## Makefile
无论是北大的[CS自学指南](https://csdiy.wiki/%E5%BF%85%E5%AD%A6%E5%B7%A5%E5%85%B7/CMake/)，还是上交IPADS实验室给出[CMake教程](https://www.bilibili.com/video/BV14h41187FZ/)，都把Makefile作为前置学习内容。所以在介绍CMake前先简单说说Makefile。

### Makefile基础

makefile是一个文本文件，也是一个DSL（特定领域语言），告诉make命令如何编译和链接程序，你需要在makefile中声明三件事：

- 目标（target）：要生成的“文件”（可执行文件`.exe`，二进制文件`.o`，依赖文件`.d`，伪目标...）
- 依赖（prerequisite）：生成目标需要哪些文件（一般的语法是：`target:prerequisites`）
- 命令（recipe）：如何从依赖生成目标文件（Windows上一般是powershell命令，Linux一般是bash，根据你使用的终端模拟器来，命令以tab开头）

除了变量声明，makefile的核心语句看起来像下面这样：
```makefile
target:prerequisites
    recipe
```

变量声明与使用：
```makefile
CC = gcc
TARGET = hello
SRCS = hello.c

$(TARGET):$(SRCS)
    $(CC) -o $@ $^
```
变量直接用`=`声明，使用的时候用`$()`包裹即可替换，`$@`与`$^`是自动变量，分别代表目标文件名和所有依赖文件名

>关于自动变量，应该是只能在命令的部分使用，直接对应命令上一行声明的目标和依赖，防止在上面的声明中打了一长串目标和依赖的文件名/变量名，到下面又要重新打一次。

伪目标的声明、定义与使用：
```makefile
.PHONY: clean
clean:
    rm -f $(TARGET)
```
第一行用`.PHONY`声明了一个叫clean的伪目标，防止项目中有叫`clean`的文件干扰导致`make clean`无法执行。
第二行声明clean目标的依赖，这里没有依赖，因为这只是单纯的删掉一些编译生成的文件。
第三行是对应的命令，执行`make clean`时就会删掉目标文件。

---

**补充**：关于`target:prerequisites`**依赖管理的必要性**
make会检测目标和依赖哪个新，如果依赖新于目标，则会重新生成目标文件。

考虑下面的项目结构：
```bash
~/cpp-program
├── main.cpp #include "foo.h"
├── foo.cpp #include "foo.h"
└── foo.h
```
makefile如下所示：
```makefile
CC = gcc
CFLAGS = -Wall -g
TARGET = prog
OBJS = main.o foo.o

$(TARGET): $(OBJS)
    $(CC) -o $@ $^

%.o:%.cpp
    $(CC) $(CFLAGS) -c $< -o $@

main.o: foo.h
foo.o: foo.h

.PHONY: clean
clean:
    rm -f $(OBJS) $(TARGET)
```
先解释`%.o:%.cpp`这一段，`%`是通配符，匹配任意非空字符串，这会找出所有`.cpp`文件并编译为`.o`文件。在下面的命令中出现了新的自动变量`$<`，它表示的是依赖文件中的第一个，在这里每次只会匹配一个`.cpp`文件，所以`$<`和`$^`的效果是一样的。但是因为各`.cpp`文件是单独编译的，在更复杂的情况下应该使用`$<`，这也成为了makefile的书写规范。

在命令中，`-o`表示自己命名目标文件，`-c`表示只编译不链接。

这里再补充一个自动变量`$*`，再上面的模式规则中，`$*`表示`%`的内容，例如`main.cpp`在`%.o:%.cpp`的匹配中，`$*`就表示`main`。

然后是`main.o: foo.h`这一段，为什么要在makefile里再手动声明头文件依赖？原因就是上面的规则特性，make会检测目标和依赖哪个更新，如果依赖更新会重新生成目标文件。

在编译过程中，确实会根据`.cpp`文件里声明的头文件依赖展开编译，但是之后如果修改了某个依赖的头文件，对应的目标文件`.o`不会重新编译（除非你make clean删掉所有文件后重新编译），所以需要在makefile里手动声明头文件依赖，告诉make在头文件被修改后需要重新编译目标文件。

我们在编写程序的时候，已经在`.cpp`里声明好了头文件依赖关系了，在makefile还要再声明一遍，非常烦。我们可以利用gcc的`-MMD`选项生成依赖文件，再makefile里包括这些依赖文件的内容，避免手动再写一遍：
```makefile
DEPS = $(OBJS.o=.d)

-include $(DEPS)

%.o:%.cpp
    $(CC) $(CFLAGS) -MMD -c $< -o $@
```
在编译选项中加入`-MMD`会生成同名的`.d`的依赖文件，其格式类似：
```cpp
main.o: main.cpp foo.h
```
通过自动生成依赖文件，并导入makefile，就免去了自己重新敲一遍头文件依赖的麻烦。

### 创建并链接静态库、动态库

在大型cpp项目中，你可以把某个模块的cpp代码编译为静态库/动态库，在项目的其他地方进行复用。

例如：llama.cpp的ggml底层矩阵运算库，它的功能比较固定，直接编译为库文件，然后当llama.cpp代码随需求改变时，不需要重新编译ggml库里的内容。

静态库创建：
```bash
gcc -c foo.cpp -o foo.o #正常生产目标文件.o
ar rcs libfoo.a foo.o #使用ar打包为.a静态库
```
- r：插入文件
- c：创建库（如果不存在）
- s：创建索引，加快链接速度
将静态库链接到可执行文件：
```bash
gcc main.o -L. -lfoo -o main
```
`-o main`已经解释过了，指定生成文件的名字为main
剩余的是依赖文件`main.o`和要链接的的静态库文件：
`-L. -lfoo`其中`-L.`告诉链接器在当前目录找库，`-lfoo`会链接叫`foo`的库，链接器会自动补全为`libfoo.a`或`libfoo.so`，也可以写为下面更易于理解的方式：
```bash
gcc main.o libfoo.a -o main
```

动态库的创建：
不能直接编译为`.o`文件，需要编译为位置无关代码(PIC,Position Independent Code)，需要在gcc编译时加上`-fPIC`选项
```bash
gcc -fPIC -c foo.cpp -o foo.o
gcc -shared -o libfoo.so foo.o
```
在生成可执行文件时的链接命令和静态库是一样的，链接器在查找库的时候会优先找动态库。

动态库还存在一个问题，动态库是在运行时加载，上面的`-L. -lfoo`其中的`-L`是告诉链接器的选项，也就是在编译时查找该库。

在运行时寻找库，只会查找系统库路径（/lib,/usr/lib），你可以在链接时用`-Wl,-rpath=.`把当前目录嵌入运行时路径，这样可执行文件在运行时，就能在本文件夹下找到该动态库。

### 系统库与第三方库的链接

对于系统库，可执行文件要找会去默认的系统路径去找，这点在大部分情况下我们不需要担心。

实际上第三方库和我们自己创建的库没有什么区别，对于开发者而言，我们希望我们的程序可以随时发布，在任何人的机器上都能运行，而不依赖于自己电脑上的某种设置。那么上面的`-Wl,-rpath='$ORIGIN/libs'`就是非常推荐的实践。在项目构建，程序链接时就将库的路径写入可执行文件，不依赖外部环境设置。

也可以在`~/.bashrc`里设置`export LD_LIBRARY_PATH=/lib/path:$LD_LIBRARY_PATH`，这样在你的终端里运行可执行程序也可以找到库文件。

你也可以编辑`etc/ld.so.conf`文件，将库路径添加到系统库搜索缓存。

简单总结一下，makefile的核心语法其实非常简单，就是声明目标和依赖，然后把命令告诉make，在写的时候非常贴近shell命令。你需要记大量的shell、gcc命令选项，而且其中有一些写法可读性比较差。

## CMake

CMake提供了更高层级的抽象，并且跨平台：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603121444841.png)

CMake的核心是目标（Target），然后每个目标都有对应的属性（Property）。常见的目标有以下几种形式：

- 可执行文件（add_executable）
- 库（add_library）
- 自定义目标（add_custom_target），这个有点像makefile里的伪目标，它们都不生成实际文件；每次构建（make clean）时都会执行，无论依赖是否更新；并且常用于清理、测试等辅助任务。

每个目标都有属性：

- 源文件列表
- 编译选项
- 链接库
- 头文件搜索路径
- 编译定义（宏）

一般通过`target_***`命令来设置这些属性，并且用可见性关键字`PRIVATE`、`PUBLIC`、`INTERFACE`来控制属性传播。

- `PRIVATE`属性只对当前目标生效，不会传递给依赖者。例如：你在写一个数学库，你可能需要一个日志库来输出中间结果，但是之后引用你这个数学库的目标不在乎这些，也不会用到。那这个属于库的内部实现细节，对于这个日志库的引用只对你的数学库生效，对引用你数学库的目标不生效。

- `PUBLIC`属性即适用于当前目标又适用于依赖者。例如：你在写一个GUI的库，你需要引用`OpenGL`的库，链接你GUI的库之后也有可能要调用`OpenGL`，那么对`OpenGL`的引用不仅对当前库生效，也对继承它的目标生效。（这里说“继承”、“引用”、“依赖”可能会引起误会，这里描述的是目标间的关系，常见的就是一个可执行文件的生成需要链接一个库）

- `INTERFACE`属性只适用于该目标的继承者。使用场景就如同它的名字，在一些模板库、接口库，只有头文件没有源文件时，目标自身不需要编译，但是需要把接口提供给继承者。

这里传递的并不是“依赖关系”而是属性，在上面举的例子中，传递的**属性**是“对某个库是否依赖”，还包括编译选项（某些库必须要求C++17标准，某些库可以使用预编译头文件加速，是否应该传递到继承该库的面向用户的目标文件）、链接选项（链接过程中是否要隐藏内部符号（防止私有类、辅助函数干扰到链接），是否要检查未定义符号等）等。

你可能还会有疑惑，“库的依赖”这个属性，不是在头文件和源文件的开头就声明了吗，为什么还要在CMake里面又声明一次呢？（实际上库的依赖和头文件依赖还不一样）
- CMake管理的是目标文件之间的属性传递，一个目标文件可能对应很多`.cpp`文件。管理的是项目若干组件之间的关系。（不同于makefile需要手动将各个`.cpp`文件编译为`.o`目标文件，然后再组织为可执行目标文件和动静态库，CMake的目标直接是后者）
- 在代码里只声明了头文件的依赖，编译器不知道头文件的位置，CMake通过`target_include_directories`告知库的头文件路径，再通过`target_link_libraries`的依赖声明传递这些路径。
- 代码里只有头文件依赖，头文件只声明接口，要找到实现（库文件），也需要`target_link_libraries`的依赖声明传递这些路径。

### CMake基础语法

- `cmake_minimum_required(VERSION 3.10)`添加CMake版本的最低标准

- `project(Prog)`定义项目名称

- `add_executable(prog main.c foo.c)`添加可执行文件目标，第一个参数是目标的名字，之后的参数是依赖源文件，注意项目名称与目标名称是两个东西，名字当然可以不同。

- `add_library(foo STATIC foo.c)`添加一个库，中间的关键字表示库的性质，可以是`STATIC`（静态库）也可以是`SHARED`（动态库）还可以是`MODULE`（插件库）。不输入库的性质默认是静态库，除非将`BUILD_SHARED_LIBS`设为`ON`。

- `target_include_directories(foo PUBLIC .)`对`foo`这个目标添加头文件搜索路径，`PUBLIC`表示任何链接`foo`的目标也会拿到这个头文件搜索路径

- `target_link_libraries(prog PRIVATE foo)`，表示在生成`prog`目标时，需要链接`foo`目标

- `add_subdirectory(lib)`进入`lib`目录，并且执行该目录下的`CMakeLists`

以上这些命令，通过看名字也大致能推测出是干什么的，可读性比Makefile好到哪里去了。`add_xxx`命令就是添加一个目标，后面的参数要么是声明目标的性质，要么是源文件。`target_xxx`命令就是给目标添加属性，第一个参数是添加的目标的名字，后面接的是对应的参数。

- `include()`主要用于CMake代码复用，将指定的CMake脚本（通常是`.cmake`文件）或模块直接包含到当前上下文中执行。（不创建新的作用域，直接作用于当前上下文）

这里可能会有疑惑，`.cmake`文件写了部分CMake代码可以复用非常好理解，**模块**是什么？模块的本质就是`.cmake`文件。有些是自己写的，有些是官方写的，可以直接调用。

例如：`include(CheckIncludeFileCXX)`CMake会自动将其转换为查找 `CheckIncludeFileCXX.cmake`文件，并在以下位置搜索：CMake安装目录下的`Modules/`（存放所有官方模块）、用户通过`CMAKE_MODULE_PATH`变量添加的自定义路径。这个模块会检查指定的C++头文件是否可以被编译。

CMake官方给定了许多模块，可以按照上面的方式，直接在CMakeLists里调用，下面给一点例子：

**系统检查类：**
|模块名|主要功能|
|-|-|
|CheckIncludeFile|检查C头文件是否存在|
|CheckSymbolExists|检查C/C++符号（函数、变量、常量）是否存在|
|CheckCCompilerFlag|检查C编译器是否支持某个编译选项|

**查找包类：**
会在引入第三方库的部分详细讲，这些模块通常不是由`include()`调用的，而是由`find_package()`命令调用的。例如，我要引入Boost包，调用`find_package(Boost)`会查找两种文件之一：FindBoost.cmake（查找模块模式）：通常用于查找未安装到标准位置的包、BoostConfig.cmake 或 boost-config.cmake（配置文件模式）：由包本身安装时提供的配置。

|模块名|主要功能|
|-|-|
|FindBoost|查找Boost C++ 库|
|FindOpenGL|查找OpenGL库|
|FindOpenSSL|查找OpenSSL加密库|

**实用工具与配置类：**

|模块名|主要功能|
|-|-|
|CMakeDependentOption|创建一个依赖于其他选项的选项|
|FeatureSummary|在配置结束时打印项目功能特性的摘要信息|
|GNUInstallDirs|定义标准的GNU安装目录变量（如 CMAKE_INSTALL_BINDIR）|

### CMake变量

关于CMake的一些书写习惯：CMake 命令不区分大小写，但变量名通常区分。习惯上命令小写，变量大写。如果路径或字符串包含空格，必须用引号括起来。

- `set(MY_VAR "hello")`设置普通变量，关于普通变量的行为，它有一种“不愿意被修改”的倾向。当从父作用域进入子作用域时，子作用域的修改默认不会影响父作用域（除非设置了PARENT_SCOPE）。当你进入`add_subdirectory(lib)`的子目录，或者函数时，子作用域会复制父作用域的所有变量（在子作用域创建副本），可以访问和修改，但只在子作用域生效。在宏中由于是文本替换，不会创建新作用域，所以行为会不同。

- `set(MY_CACHE_VAR "cache value" CACHE STRING "Description")`创建一个缓存变量，全局可见可修改。这里的行为是：如果不存在`MY_CACHE_VAR`的缓存变量，就创建并将值设为`"cache value"`，如果已经存在那就不会覆盖。`CACHE`表示为缓存变量，`STRING`表示变量类型为字符串（`BOOL`、`PATH`、`FILEPATH`），`"Description"`是对变量的描述。

- `option(BUILD_TESTING "Build tests" ON)`更加常见，option本质上是一个BOOL类型的缓存变量，默认值可以是ON或OFF。

- `message("MY_VAR = ${MY_VAR}")`打印变量

CMake 预定义了大量有用的变量，用于获取项目路径、编译器信息、构建配置等。下面举例说明一些：
**路径相关变量：**
|变量|说明|
|-|-|
|CMAKE_CURRENT_SOURCE_DIR|当前正在处理的 CMakeLists.txt 所在的源码目录|
|CMAKE_CURRENT_BINARY_DIR|当前正在处理的 CMakeLists.txt 对应的构建目录（通常是 build/subdir）|
|PROJECT_SOURCE_DIR|最近一次调用 project() 命令的源码目录|
|CMAKE_SOURCE_DIR|顶层源码目录（即最外层 CMakeLists.txt 所在的目录）|
|CMAKE_BINARY_DIR|顶层构建目录（运行 cmake 命令时所在的目录）|

**编译器相关变量：**
|变量|说明|
|-|-|
|CMAKE_C_COMPILER、CMAKE_CXX_COMPILER|C、C++编译器路径|
|CMAKE_C_STANDARD、CMAKE_CXX_STANDARD|设置C、C++编译标准|
|CMAKE_CXX_STANDARD_REQUIRED|若为ON，则编译器必须支持指定的标准|

**系统相关变量：**
|变量|说明|
|-|-|
|CMAKE_SYSTEM_NAME|目标系统的名称（Linux、Windows）|
|CMAKE_SYSTEM_PROCESSOR|目标系统的处理器架构（x86_64）|
|WIN32、APPLE、UNIX|平台相关的布尔变量，常用于条件判断。|

### CMake控制流

- 判断条件：
```cmake
if(WIN32)
    message("This is Windows")
elseif(APPLE)
    message("This is macOS")
elseif(UNIX)
    message("This is Linux/Unix")
else()
    message("Unknown platform")
endif()
```

- 循环
```cmake
set(SOURCES main.c foo.c bar.c)
foreach(src ${SOURCES})
    message("Source file: ${src}")
endforeach()
```
```cmake
foreach(i RANGE 1 5)
    message("i = ${i}")
endforeach()
```

- 函数与宏
```cmake
# 函数定义
function(my_func arg1 arg2)
    set(result "${arg1}${arg2}" PARENT_SCOPE)
endfunction()

my_func("hello" "world")
message("result = ${result}")

# 宏定义
macro(my_macro arg)
    set(var "宏内部: ${arg}")
endmacro()
my_macro("test")
message("var = ${var}")  # 宏内设置的变量在外部可见
```

### 第三方库引入

使用`find_package`命令去查找和导入第三方库。有两种导入方式：

- 模块模式（Module mode）：CMake 自带或项目提供的 `Find<Package>.cmake` 脚本，设置一些变量（如 OpenCV_INCLUDE_DIRS、OpenCV_LIBS）。
```cmake
find_package(OpenCV REQUIRED)

if(OpenCV_FOUND)
    include_directories(${OpenCV_INCLUDE_DIRS})
    add_executable(display display.cpp)
    target_link_libraries(display ${OpenCV_LIBS})
endif()
```

- 配置模式（Config mode）：库本身提供了 `<Package>Config.cmake` 或 `<package>-config.cmake` 文件，里面定义了导入目标（如 OpenCV::core）。这是现代 CMake 推荐的方式。
```cmake
find_package(OpenCV REQUIRED)

add_executable(display display.cpp)
target_link_libraries(display PRIVATE opencv_core opencv_highgui)
```

CMake查找这些库的配置文件的方式非常智能，会按照优先级一层一层往下寻找：

- 包专用路径`<PackageName>_DIR`缓存变量，变量指向一个包含配置文件的目录

- 用户提供的辅助路径`CMAKE_PREFIX_PATH`变量，就是一般你把第三方库安装在哪里

- 系统环境路径，例如：环境变量`PATH`，各操作系统的标准安装路径（例如：Linux下的/usr 和 /usr/local 下的 lib/cmake、share/cmake 等目录、Windows下的Program Files 下的相应路径）