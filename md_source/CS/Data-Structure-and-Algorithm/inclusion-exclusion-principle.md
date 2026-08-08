## 容斥定理

1. 对于数组，计算x之前  vector<int>nums 中所有元素的倍数的个数

例如nums=[2,3,5]就是丑数的情况。

[3116. 单面值组合的第 K 小金额](https://leetcode.cn/problems/kth-smallest-amount-with-single-denomination-combination/)

为什么要用容斥定理？因为某个小于x的数可能是nums中若干数的公共倍数，可能导致计重。
代码：
```c++
class Solution {
public:
    long long findKthSmallest(vector<int>& coins, int k) {
        auto check = [&](long long m) -> bool {
            long long cnt = 0;
            for (int i = 1; i < (1 << coins.size()); i++) { // 枚举所有非空子集
                long long lcm_res = 1; // 计算子集 LCM
                for (int j = 0; j < coins.size(); j++) {
                    if (i >> j & 1) {
                        lcm_res = lcm(lcm_res, coins[j]);
                        if (lcm_res > m) { // 太大了
                            break;
                        }
                    }
                }
                cnt += __builtin_popcount(i) % 2 ? m / lcm_res : -m / lcm_res;
            }
            return cnt >= k;
        };

        long long left = k - 1, right = (long long) ranges::min(coins) * k;
        while (left + 1 < right) {
            long long mid = (left + right) / 2;
            (check(mid) ? right : left) = mid;
        }
        return right;
    }
};
```

代码用到了位运算与集合的思想