# llama-context代码阅读

`llama-context.h`核心只有一个类`llama_context`，是推理引擎的核心。是 llama.cpp 库中负责组织 LLM 推理计算的核心组件，它作为中央协调器管理整个推理生命周期