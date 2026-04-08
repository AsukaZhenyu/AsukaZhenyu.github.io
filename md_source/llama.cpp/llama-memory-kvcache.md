# memory与kv cache相关代码阅读

与memory相关的文件：
`llama-memory.h/.cpp` 顶层抽象接口
`llama-memory-recurrent.h/.cpp` 用于RWKV、Mamba等循环模型
`llama-memory-hybird.h/.cpp` 每层选择正常注意力还是循环
`llama-memory-hybrid-iswa.h/.cpp` 每层选择正常注意力（swa支持）还是循环

与kv cache相关的文件：
`llama-kv-cells.h` 管理KV Cache的元数据
`llama-kv-cache.h/.cpp` 标准KV Cache实现
`llama-kv-cache-iswa.h/.cpp` 每层选择是否需要滑动窗口

这些文件内的基本结构如下图所示：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603302053529.png)

头文件的依赖关系：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603302125398.png)

## llama-memory.h/.cpp
