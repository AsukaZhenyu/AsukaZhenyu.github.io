# llama-adapter代码阅读

[toc]
</br>

`llama-adapter.h`非常简单，只有两个类：`llama_adapter_cvec`
、`llama_adapter_lora`

在LLM语境下，Adapter适配器是一种参数高效微调技术（PEFT, Parameter-Efficient Fine-Tuning）

PEFT是相对全量微调（Full Fine-Tuning）而言的，是在不修改原始预训练模型权重的情况下，通过插入并训练少量额外参数，让模型适应新任务或新领域的方法。

## PEFT basics

## Adapter in llama.cpp

关于在llama.cpp中适配器，在Reddit上有一篇[帖子](https://www.reddit.com/r/LocalLLaMA/comments/17mrd3y/comment/k7ocu3y/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)简要介绍了一下。

Adapter是一个文件，负责指明要把**哪些参数**修改为**哪些值**。在llama.cpp中支持**运行时**动态切换适配器。无需将主模型从内存中卸载，即可随时更换适配器。

### cvec

cvec表示control vector

### lora

LoRA表示(Low-Rank Adaptation)