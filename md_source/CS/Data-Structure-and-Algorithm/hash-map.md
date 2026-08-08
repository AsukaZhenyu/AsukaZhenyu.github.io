# 哈希表

本篇记录一些哈希表的使用技巧



1. 双哈希表

   一个哈希表记录元素的出现次数，另一个哈希表记录出现次数的出现次数。

[2671. 频率跟踪器](https://leetcode.cn/problems/frequency-tracker/)
```c++
class FrequencyTracker {
    unordered_map<int, int> cnt; // number 的出现次数
    unordered_map<int, int> freq; // number 的出现次数的出现次数
public:
    FrequencyTracker() {}

    void add(int number) {
        --freq[cnt[number]]; // 去掉一个旧的 cnt[number]
        ++freq[++cnt[number]]; // 添加一个新的 cnt[number]
    }

    void deleteOne(int number) {
        if (!cnt[number]) return; // 不删除任何内容
        --freq[cnt[number]]; // 去掉一个旧的 cnt[number]
        ++freq[--cnt[number]]; // 添加一个新的 cnt[number]
    }

    bool hasFrequency(int frequency) {
        return freq[frequency]; // 至少有一个 number 的出现次数恰好为 frequency
    }
};

```
在计数问题里，使用map既方便而且不浪费空间，不需要提前预设存储的空间，超级方便。但是如果要判断某个次数是否出现则需要遍历一次，效率太低了。

可以考虑用双哈希表存储，一个表存各个元素出现的次数，另一个哈希表存每个“出现次数”的出现次数，这样做可以在O(1)的时间里判断某个“出现次数”是否出现过，第二个哈希表也是可以实时维护的。

相应的,如果要返回"value"对应的"key",能不能用双哈希表做呢?我认为这也是可以实现的,哪怕是在多个答案有要求地返回,也是能够实现的.

[2671. 频率跟踪器](https://leetcode.cn/problems/frequency-tracker/)
```c++
class FrequencyTracker {
    unordered_map<int, int> cnt; // number 的出现次数
    unordered_map<int, int> freq; // number 的出现次数的出现次数
public:
    FrequencyTracker() {}

    void add(int number) {
        --freq[cnt[number]]; // 去掉一个旧的 cnt[number]
        ++freq[++cnt[number]]; // 添加一个新的 cnt[number]
    }

    void deleteOne(int number) {
        if (!cnt[number]) return; // 不删除任何内容
        --freq[cnt[number]]; // 去掉一个旧的 cnt[number]
        ++freq[--cnt[number]]; // 添加一个新的 cnt[number]
    }

    bool hasFrequency(int frequency) {
        return freq[frequency]; // 至少有一个 number 的出现次数恰好为 frequency
    }
};

```

如果每一次改变，都要删除元素的话，效率比较低。这时可以采取“软删除”的思路，也就是操作完了以后，先不对第二个哈希表处理，每次取堆顶的时候去第一个哈希表那里验证目前的答案是否有问题。在灵神的许多题解里，尤其是与堆相关时。（Dijstra算法用最小堆优化时，push进入的路径长可能是不准确的，需要和dist数组“对答案”，这其实已经体现了软删除的思想）

2. 哈希表数组

   [Problem - 1996C - Codeforces](https://codeforces.com/problemset/problem/1996/C)

3. 用于提高查找元素的效率

   技巧1：枚举右，寻找左
   
   利用哈希表优化双重循环，用空间换时间。在遍历时直接做好前缀信息的积累。另外只遍历一侧（左侧，已经遍历的一侧）（双变量问题）对直接暴力也是很有启发性的。
   ```c++
   class Solution {
   public:
       vector<int> twoSum(vector<int>& nums, int target) {
           unordered_map<int,int> ind;
           for(int j=0;j<nums.size();j++){
               auto it=ind.find(target-nums[j]);
               if(it!=ind.end()){
                   return {it->second,j};
               }
               ind[nums[j]]=j;
           }
           return {-1,-1};
       }
   };
   ```

   核心思想在于将正在枚举的这个变量视作常量，将两个变量变换的性质变为查找变量的性质。
