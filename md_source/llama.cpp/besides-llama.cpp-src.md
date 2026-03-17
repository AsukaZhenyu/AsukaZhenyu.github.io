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