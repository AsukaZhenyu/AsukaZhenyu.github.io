## 二分查找

当问题具有单调性，而直接构造答案又十分困难的时候，可以考虑二分查找答案。
单调性指的是：
> ans越大，符合条件的概率越大，ans越小，就越不可能符合条件。
> ans满足条件时，ans+1必然满足条件，ans不满足条件时，ans-1必然不满足条件。

二分查找的优势在于：只需验证答案是否满足条件，这一步可以直接贪心。然后再查找出最大最小满足条件的值。将复杂的问题分成两个部分。

#### 基础知识

1. 基本变形思路

[1146. 快照数组](https://leetcode.cn/problems/snapshot-array/)
```c++
class SnapshotArray {
    int cur_snap_id = 0;
    unordered_map<int, vector<pair<int, int>>> history; // 每个 index 的历史修改记录
public:
    SnapshotArray(int) {}

    void set(int index, int val) {
        history[index].emplace_back(cur_snap_id, val);
    }

    int snap() {
        return cur_snap_id++;
    }

    int get(int index, int snap_id) {
        auto& h = history[index];
        // 找快照编号 <= snap_id 的最后一次修改记录
        // 等价于找快照编号 >= snap_id+1 的第一个修改记录，它的上一个就是答案
        int j = ranges::lower_bound(h, make_pair(snap_id + 1, 0)) - h.begin() - 1;
        return j >= 0 ? h[j].second : 0;
    }
};

作者：灵茶山艾府
链接：https://leetcode.cn/problems/snapshot-array/solutions/2756291/ji-lu-xiu-gai-li-shi-ha-xi-biao-er-fen-c-b1sh/
来源：力扣（LeetCode）
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。
```
`lower_bound()`返回第一个大于等于val的位置
`upper_bound()`返回第一个大于val的位置

对于本题，找到序号为snap_id的数 $\rightarrow$找到序号<=snap_id的最后一个$\rightarrow$找到序号>=snap_id+1的前一个序号。

也可以用`*****_bound(begin,end,val,greater<type>())`来二分查找降序数组。

![78b68302e23e8d87eed6d056d231838](C:\Users\lzy\AppData\Local\Temp\WeChat Files\78b68302e23e8d87eed6d056d231838.png)

##### 红蓝染色法

##### 变形

#### 解题思路

1. 二分查找答案  [3048. 标记所有下标的最早秒数 I](https://leetcode.cn/problems/earliest-second-to-mark-indices-i/)

   每次二分判断mid是否满足条件，然后根据单调性对区间染色，最后得到答案。

2. 二分查找第k大/小  [2386. 找出数组的第 K 大和](https://leetcode.cn/problems/find-the-k-sum-of-an-array/)

   每次二分判断答案之前是否有k个满足条件的数。

   >问：有没有可能，二分得到的值，并不是 nums的子序列和？比如 nums[i]都是偶数，但二分得到的却是一个奇数。
   >
   >答：设二分得到的值为 x，那么 x 一定是 nums的子序列和。使用反证法证明：
   >
   >假设 x 不是 nums的子序列和，也就是没有任何子序列的和等于 x，这意味着 s≤x 等价于 s≤x−1我们能从 nums中找到 k 个元素和不超过 x−1的子序列，所以 check(x−1)=true。但二分循环结束时，有 check(x−1)=false ，矛盾，所以原命题成立，x 一定是 nums 的子序列和。
   >
   >作者：灵茶山艾府
   >链接：https://leetcode.cn/problems/find-the-k-sum-of-an-array/solutions/1764389/zhuan-huan-dui-by-endlesscheng-8yiq/
   >来源：力扣（LeetCode）
   >著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。
   
   这可能就是二分查找能找第k大/小的原理，每个节点才是判断的转折点，最终二分得到的答案一定不是在节点之间的数。



构造二分法（优化遍历查找）

[2055. 蜡烛之间的盘子](https://leetcode.cn/problems/plates-between-candles/)

自然的思路是先用前缀和计算出l、r之间的盘子个数，然后遍历掐头去尾。问题是效率太低了，可以记录下所有蜡烛的位置，然后二分查找l右边最近的蜡烛，r左边最近的蜡烛即可。

这里也可以用前/后缀数组，免去二分用空间换时间。
```c++
class Solution {
public:
    vector<int> platesBetweenCandles(string s, vector<vector<int>>& qs) {
        vector<int> l(s.length(), 0), r(s.length(), 0);
        vector<int> sum(s.length() + 1, 0);
        for (int i = 0, j = s.length() - 1, p = -1, q = -1; i < s.length(); i++, j--) {
            if (s[i] == '|') p = i;
            if (s[j] == '|') q = j;
            l[i] = p; r[j] = q;
            sum[i + 1] = sum[i] + (s[i] == '*' ? 1 : 0);
        }
        vector<int> ans(qs.size(), 0);
        for (int i = 0; i < qs.size(); i++) {
            int a = qs[i][0], b = qs[i][1];
            int c = r[a], d = l[b];
            if (c != -1 && c <= d) ans[i] = sum[d + 1] - sum[c];
        }
        return ans;
    }
};

作者：宫水三叶
链接：https://leetcode.cn/problems/plates-between-candles/solutions/1319516/gong-shui-san-xie-er-fen-qian-zhui-he-yu-0qt0/
来源：力扣（LeetCode）
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。
```
