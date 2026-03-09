## 枚举

有些问题既没法贪心也没法DP，那就只能枚举了。

[2555. 两个线段获得的最多奖品](https://leetcode.cn/problems/maximize-win-from-two-segments/) 

[3287. 求出数组中最大序列值](https://leetcode.cn/problems/find-the-maximum-sequence-value-of-array/) 
给定k，取长度为2k的子序列，求最大值$(x[i]|x[i+1] | ...|x[i+k-1])\wedge(x[i+k] | ... | x[i+2*k-1])$
对于或于异或的运算，没有上面好的性质，这里要用0-1背包计算出所有情况，逐个枚举取最大值