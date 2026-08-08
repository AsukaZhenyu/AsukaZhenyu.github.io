# 差分数组

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311459804.png)



## 问题

**关键词：**子数组，子数组一起加减，

1. 上下车模型 - 计算每个时刻车上的人数
LC2406
写法一：数组
```c++
class Solution {
public:
    int minGroups(vector<vector<int>>& intervals) {
        vector<int> ans(1e6+5);
        int n=0;
        for(auto e:intervals){
            ans[e[0]]++;
            ans[e[1]+1]--;
            n=max(n,e[1]);
        }
        int mx_lapping=0,lapping=0;
        for(int i=0;i<=n;i++){
            lapping+=ans[i];
            mx_lapping=max(mx_lapping,lapping);
        }
        return mx_lapping;
    }
};
```
写法二：哈希表（稀疏、不确定范围）
```c++
class Solution {
public:
    int minGroups(vector<vector<int>> &intervals) {
        map<int, int> diff;
        for (auto &p : intervals)
            ++diff[p[0]], --diff[p[1] + 1];
        int ans = 0, sum = 0;
        for (auto &[_, d] : diff)
            ans = max(ans, sum += d);
        return ans;
    }
};
```


2. 可以对任意长度子数组操作，求最小的操作次数
    LC3229
    子数组上的操作->差分数组上的操作。让所有数都为0->差分数组都为0。差分数组是对数组元素成对操作，而不是成片操作。
```c++
class Solution {
public:
    long long minimumOperations(vector<int>& nums, vector<int>& target) {
        int n=nums.size();
        for(int i=0;i<n;i++){
            target[i]-=nums[i];
        }
        vector<int> sub(n);
        sub[0]=target[0];
        for(int i=1;i<n;i++){
            sub[i]=target[i]-target[i-1];
        }
        long long pos=0,neg=0;
        for(int i=0;i<n;i++){
            if(sub[i]>0) pos+=sub[i];
            else neg-=sub[i];
        }
        return max(pos,neg);
    }
};
```


3. 限定子数组长度（形状），判断是否能完成
    一维：LC2772、二维：LC2132

4. 转化为上下车模型（数组求值）
   LC3224、LC2406（被覆盖的次数->人数）

   **分段函数**的更新可以用差分。

   如果一个问题要枚举目标$O(n)$并求解其中的最小值，每个目标的求解比较复杂$O(n)$，直接做肯定会TLE，肯定要优化。

   差分数组是一个优化思路，把每个目标值放在一个数组里，`f[x]`表示目标为x时的答案，用差分数组的思路去计算，处理好**每个对象**对区间`x0~xn`的**贡献**是多少，这样就将问题优化到$O(n)$。

```c++
class Solution {
public:
    int minChanges(vector<int>& nums, int K) {
        int n = nums.size();
        // 差分数组
        int f[K + 2];
        memset(f, 0, sizeof(f));
        // 枚举每个数对
        for (int i = 0, j = n - 1; i < j; i++, j--) {
            int d = abs(nums[i] - nums[j]);
            int mx = max({nums[i], K - nums[i], nums[j], K - nums[j]});
            // 0 <= x < d 时需要一次操作
            f[0]++; f[d]--;
            // d < x <= mx 时需要一次操作
            f[d + 1]++; f[mx + 1]--;
            // x > mx 时需要两次操作
            f[mx + 1] += 2;
        }

        int ans = n;
        // 枚举 x 的取值，看最少需要几次操作
        for (int i = 0, now = 0; i <= K + 1; i++) {
            now += f[i];
            ans = min(ans, now);
        }
        return ans;
    }
};
```



对于数组a[i],定义差分数组diff[i]:
	diff[0]=a[0]
	diff[i]=a[i]-a[i-1]
性质：如果对下标[i-j]都加上x，只需将diff[i]加上x，diff[j+1]减去x
恢复：从左到右求和就行

[1094. 拼车](https://leetcode.cn/problems/car-pooling/)

如果陷在模拟的思路里出不来：总想着要减，要排序。（结构体/自定义排序一直不会）
但是可以用一个数组去表示各个时刻车上的人数，这样的话就是对某个子数组操作，不需要排序。

```c++
class Solution {
public:
    bool carPooling(vector<vector<int>>& trips, int capacity) {
        int d[1001]{};
        for(auto &t:trips){
            int n=t[0],fo=t[1],to=t[2];
            d[fo]+=n;
            //为什么不是to+1
            d[to]-=n;
        }
        int sum=0;
        for(int i=0;i<1001;i++){
            sum+=d[i];
            if(sum>capacity) return 0;
        }
        return 1;
    }
};
```