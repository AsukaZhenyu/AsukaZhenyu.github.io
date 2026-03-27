# 深度神经网络分布式计算基础

pytorch有[教程](https://docs.pytorch.org/tutorials/distributed.html)介绍如何分布式训练DNN模型。

本文关注现代LLM训练、推理的分布式计算策略。数据并行、张量并行、流水线并行、序列并行

## 训练

pytorch DDP -> FSDP -> Megatron-LM

主流方案：Megatron-LM (TD+PD) + DeepSpeed (ZeRO)

## 推理

PD分离