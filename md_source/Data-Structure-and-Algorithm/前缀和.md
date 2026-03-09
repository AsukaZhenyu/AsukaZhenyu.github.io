## 前缀和
>前置知识：前缀和
对于数组 stones，定义它的前缀和 s[0]=0,s[i+1]=$$\sum_{j=0}^{i+1}$$stones[j]

### 二维数组的前缀和
直接上灵神的题解![matrix-sum.png](https://pic.leetcode.cn/1692152740-dSPisw-matrix-sum.png)

本质上也可以理解为递推，或者原问题和子问题，和动态规划有些相似。

### 前缀和的二种用法

1. 数组


2. set

前缀和是空间换时间的优化工具，自由度也很高。当关心**子数组大小**而不关心**子数组位置**时，可以用集合set来维护。

[363. 矩形区域不超过 K 的最大数值和](https://leetcode.cn/problems/max-sum-of-rectangle-no-larger-than-k/)
```c++
class Solution {
public:
    int maxSumSubmatrix(vector<vector<int>> &matrix, int k) {
        int ans = INT_MIN;
        int m = matrix.size(), n = matrix[0].size();
        for (int i = 0; i < m; ++i) { // 枚举上边界
            vector<int> sum(n);
            for (int j = i; j < m; ++j) { // 枚举下边界
                for (int c = 0; c < n; ++c) {
                    sum[c] += matrix[j][c]; // 更新每列的元素和
                }
                set<int> sumSet{0};
                int s = 0;
                for (int v : sum) {
                    s += v;
                    auto lb = sumSet.lower_bound(s - k);
                    if (lb != sumSet.end()) {
                        ans = max(ans, s - *lb);
                    }
                    sumSet.insert(s);
                }
            }
        }
        return ans;
    }
};
```
每次更新答案时，需要找到之前最大的前缀和，用set维护可以减少一次遍历。

[3152. 特殊数组 II](https://leetcode.cn/problems/special-array-ii/)

我的思路是：分组循环+二分查询。但是这道题还能用前缀和做，非常简洁。

可以用前缀和数组的两个端点判断子数组的性质。

```c++
class Solution {
public:
    vector<bool> isArraySpecial(vector<int>& nums, vector<vector<int>>& queries) {
        vector<int> s(nums.size());
        for (int i = 1; i < nums.size(); i++) {
            s[i] = s[i - 1] + (nums[i - 1] % 2 == nums[i] % 2);
        }
        vector<bool> ans(queries.size());
        for (int i = 0; i < queries.size(); i++) {
            auto& q = queries[i];
            ans[i] = s[q[0]] == s[q[1]];
        }
        return ans;
    }
};
```