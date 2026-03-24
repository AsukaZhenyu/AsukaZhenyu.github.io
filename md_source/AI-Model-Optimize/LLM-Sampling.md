# LLM采样

在LLM确定下一个token输出什么之前，LLM拿到的是一个概率表，这个概率表它表达的是各个tokens是下一个输出的token的概率。

如果是分类任务/判断任务，选择概率最高的哪个就行了，但是对于文本生成任务则有不一样的考量。

如果没有采样策略，模型通常只会选择概率最高的词（贪婪解码），但这往往会导致文本重复、缺乏创造力。Sampling 的目标是在“连贯性”和“多样性”之间寻找平衡。

## Greedy Decoding（贪婪解码）

## Temperature Sampling（温度采样）

## Top-K Sampling

## Top-P (Nucleus) Sampling（核采样）

## Beam Search（束搜索）