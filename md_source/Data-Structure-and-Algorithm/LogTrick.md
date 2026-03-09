# LogTrick

对于数组`nums`要遍历其所有子数组 and、or、GCD、LCM的结果。直接暴力是$O(n^2)$的做法，但是优化后可以达到$O(nlogU)  ,U=max(nums)$。

核心：

1. 原地更新，i从0遍历到n-1，每个数更新为当前位置到`i`的操作结果。
2. 每次向前更新的时候，判断操作对当前有没有影响，如果对当前没有影响，对之后也没有影响了，可以推测循环了。

[1521. 找到最接近目标值的函数值](https://leetcode.cn/problems/find-a-value-of-a-mysterious-function-closest-to-target/) and

[3171. 找到按位或最接近 K 的子数组](https://leetcode.cn/problems/find-subarray-with-bitwise-or-closest-to-k/) or

模板
```c++
class Solution {
public:
    int minimumDifference(vector<int>& nums, int k) {
        int ans = INT_MAX;
        for (int i = 0; i < nums.size(); i++) {
            int x = nums[i];
            ans = min(ans, abs(x - k));
            // 如果 x 是 nums[j] 的子集，就退出循环
            for (int j = i - 1; j >= 0 && (nums[j] | x) != nums[j]; j--) {
                nums[j] |= x;
                ans = min(ans, abs(nums[j] - k));
            }
        }
        return ans;
    }
};
```