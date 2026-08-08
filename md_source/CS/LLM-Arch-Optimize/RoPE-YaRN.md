# RoPE和YaRN

[toc]
</br>

提到LLM的长上下文和位置编码就绕不开RoPE和YaRN，本文介绍位置编码相关知识。

## RoPE

### NTK-Aware Scaling

在长上下文

## YaRN

YaRN的[论文地址](https://arxiv.org/abs/2309.00071)

最早是在模型推理上下文看到YaRN的，原生上下文窗口通常指模型在预训练阶段所采用的序列长度。为了突破预训练成本的限制，研究者常在微调或后训练阶段引入长序列扩展技术。例如，DeepSeek-V3在预训练阶段采用 4K 上下文窗口，随后通过 YaRN (Yet another RoPE extensioN) 技术将其逐步外推至 128K。