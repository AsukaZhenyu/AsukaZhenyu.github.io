# DP

[toc]

**状态定义**必须是确定的、单一的，不能是模糊的、不确定的、多元的。

`f[i][0]`表示没有操作的最大值，`f[i][1]`表示可以操作一次的最大值
`f[i][0]`表示没有操作的最大值，`f[i][1]`表示已经操作一次的最大值
在状态转移时，不确定性会放大。一步确定，步步确定，才能利用好性质，总之要便于状态转移。

有没有**例外**呢？状态参数必须是$==$吗，不能是$>=$这类的吗？
有！请看DP优化第二节。



DP有查表法：从已经计算的状态转移过来

还有刷表法：考察当前状态可以转移到哪些状态去

## 背包

核心就是：**选或不选**
背包问题的优化：对于求`min/max`可以用二进制优化、单调队列优化。

**01背包** 
外层循环备选的物品，内层循环状态参数，一般是倒序
不可以重复选，状态转移时用到**更新前**的数据。

1. 装满-总价值最小
```python
#value=[],volume=[]
def dfs(i:int,res:int)->int:
	if j<=0:return 0 #没有空间了
	if i<0:return inf #选完了
	return min(dfs(i-1,res-volume[i])+value[i],dfs(i-1,res)) #选或不选
```
```python
f=[0]+[inf]*n
for c,v in zip(cost,volume):
	for j in range(n,0,-1):
		f[j]=min(f[j],f[j-v]+c)
```


2. 装满-物品数最多
```python
f=[0]+[-inf]*target
s=0
for x in nums:
    s=min(s+x,target)
    for j in range(s,x-1,-1):
        f[j]=max(f[j],f[j-x]+1)
return f[-1] if f[-1]>0 else -1
```

**完全背包** 
外层遍历物品，内层遍历状态参数，一般正向遍历。
可以重复选，状态转移时用到**更新后**的数据。

1. 装满-种类数计算：
```python
f=[1]+[0]*amount
for c in coins:
    for j in range(c,amount+1):
        f[j]+=f[j-c]
return f[amount]
```

2. 装满-物品数最小：
` f[i+1][res]=min(f[i+1][res-nums[i]]+1,f[i][res])`
```python
f=[0]+[inf]*(amount)
for i,c in enumerate(coins):
    for j in range(c,amount+1):
        f[j]=min(f[j-c]+1,f[j])
```

**多重背包**
无需额外添加参数，状态转移：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311503420.png)

可以看出和**01背包**差不多，需要从前一个状态(i-1)转移过来，所以是倒序遍历。
空间优化后k就不是从0开始了，因为自己就是从发i-1转移过来的。
```c++

int f[target + 1];
memset(f, 0, sizeof(f));
f[0] = 1;
for (auto &p : types) {
    int count = p[0], marks = p[1];
    for (int j = target; j > 0; --j)
        for (int k = 1; k <= min(count, j / marks); ++k)
            f[j] = (f[j] + f[j - k * marks]) % MOD;
}
return f[target];
```

## 线性DP
**最长公共子序列（LCS）**
```c++
for(int i=0;i<n;i++)
	for(int j=0;j<m;j++)
		f[i+1][j+1]=s[i]==t[j]?f[i][j]+1:max(f[i][j+1],f[i+1][j]);
```
优化：
```c++
for(char x:s){
	for(int j=0,pre=0;j<m;j++){
		int tmp=f[j+1];
		f[j+1]=x==t[j]?pre+1:max(f[j+1],f[j]);
		pre=tmp;
	}
}
```
**最长递增子序列（LIS）**
$O(n^2)$解法：
```c++
int f[n];
memset(f,0,sizeof(f));
for(int i=0;i<n;i++){
	for(int j=0;j<i;j++){
		if(nums[j]<nums[i]){
			f[i]=max(f[i],f[j]);
		}
	}
	f[i]+=1;
}
//f中的最大值即是答案
```

优化：交换状态与状态值
`f[i]`表示末尾元素为`nums[i]`的LIS长度
`g[i]`表示长度为i+1的IS的末尾元素的最小值
g是严格递增的，每次只能更新第一个$\ge$nums[i]的位置（如果序列不要求严格递增，这里要寻找第一个严格大于`nums[i]`的位置更改）。贪心加二分解决，复杂度$O(nlog(n))$。

```c++
vector<int> g;
for(int x:nums){
    auto it=lower_bound(g.begin(),g.end(),x);
    if(it==g.end()){
        g.push_back(x);
    }else{
        *it=x;
    }
}
return g.size();
```
空间优化：
```c++
auto end = nums.begin();
for (int x : nums) {
    auto it = lower_bound(nums.begin(), end, x);
    *it = x;
    if (it == end) { // >=x 的 g[j] 不存在
        ++end;
    }
}
return end - nums.begin();
```

## 拓扑排序DP
1. DAG（有向无环图）求最长路线：

## 以节点为对象DP

一般对于**网格图**都是以行或列为对象进行DP，但是在一些情况以网格中的节点为对象DP会更好一些。

如果硬要以行列为单位进行DP，会导致每次状态转移的开销很大。例如需要$O(n)$的遍历，这时候肯定需要优化，要么用单调队列、前缀和等，要么换一个思路，`不从位置入手i、j`而是从节点`数值`入手，记录各个数值出现的位置再DP。

[2713. 矩阵中严格递增的单元格数](https://leetcode.cn/problems/maximum-strictly-increasing-cells-in-a-matrix/) 

选的下一个数必须大于当前的数，需要在当前行、列去搜索。

[3276. 选择矩阵中单元格的最大得分](https://leetcode.cn/problems/select-cells-in-grid-with-maximum-score/) 

每列选一个数字（诱惑你`dfs(row,mask)`），下一个数的数值不能选已经选过的数字。
```c++
class Solution {
public:
    int maxScore(vector<vector<int>>& grid) {
        unordered_map<int,int> pos;
        int m=grid.size();
        for(int i=0;i<m;i++){
            for(int x:grid[i]){
                pos[x] |= 1<<i;
            }
        }
        vector<int> all_num;
        for(auto &[x,_]:pos){
            all_num.push_back(x);
        }
        int n=all_num.size();
        vector<vector<int>> memo(n,vector<int>(1<<m,-1));
        auto dfs=[&](auto&& dfs,int i,int j)->int{
            if(i<0) return 0;
            int &res=memo[i][j];
            if(res!=-1) return res;
            res=dfs(dfs,i-1,j);
            int x=all_num[i];
            for(int t=pos[x],lb;t;t^=lb){
                lb=t&-t;
                //将一个数只保留二进制下最右边的1的位
                if((j&lb)==0){
                    res=max(res,dfs(dfs,i-1,j|lb)+x);
                }
            }
            return res;
        };
        return dfs(dfs,n-1,0);
    }
};
```

## 数位DP
**问题特征：**1-n之间满足条件的数的个数。

**重点：**一个不规则的上界。

正如名字所揭示的那样，在每一个数位上进行选择，状态转移。
`dp(i,mask,islimit,isnum)`
i表示现在填的位置，mask记录之前填的记录，islimit的含义是前面填的数字是否是与n一致（后续的枚举最大是n的i位的数字），isnum表示前面有没有填写数字。

[600. 不含连续1的非负整数](https://leetcode.cn/problems/non-negative-integers-without-consecutive-ones/)

```c++
class Solution {
public:
    int findIntegers(int n) {
        int m = __lg(n); // n 的最高位
        vector<array<int, 2>> memo(m + 1, {-1, -1}); // -1 表示没有计算过
        auto dfs = [&](auto&& dfs, int i, bool pre1, bool is_limit) -> int {
            if (i < 0) {
                return 1;
            }
            if (!is_limit && memo[i][pre1] >= 0) { // 之前计算过
                return memo[i][pre1];
            }
            int up = is_limit ? n >> i & 1 : 1;
            int res = dfs(dfs, i - 1, false, is_limit && up == 0); // 填 0
            if (!pre1 && up == 1) { // 可以填 1
                res += dfs(dfs, i - 1, true, is_limit); // 填 1
            }
            if (!is_limit) {
                memo[i][pre1] = res; // 记忆化
            }
            return res;
        };
        return dfs(dfs, m, false, true); // 从高位到低位
    }
};
```

并不是所有的参数都需要记忆化，有些情况是不会重复遇到的。例如本题的islimit完全可以当一个flag用，只有f(i,pre1)是会重复遇到 的。同样数位DP的参数需要具体问题具体分析。

从上面可以看出，数位DP的核心就是is_limit，当n已经计算完下面凑整的情况时，需要计算不规则的残余时，才需要is_limit，而这个情况是不会重复遇到的。所谓残余情况，在问题考察的进制下，显然是整幂次最好处理，例如$10^k$或$2^k$，但是n不一定是整幂次，减去一个比n小的最大整幂次，就是残余情况。残余情况会有一个性质，那就是如果前面的位填的数字和n一样，后面的数字就一定有限制，前面填的数字一旦不一样了，就可以化归到整幂的情况了（需要记忆化）。

对于这种**不规则上限**，有**残余情况**需要处理时，也不一定就要用数位DP，也许可以利用数学上的一些性质直接计算。

[3007. 价值和小于等于 K 的最大数字](https://leetcode.cn/problems/maximum-number-that-sum-of-the-prices-is-less-than-or-equal-to-k/)

```c++
class Solution {
public:
    long long findMaximumNumber(long long k, int x) {
        auto check=[&](long long num)->bool{
            long long res=0;
            int i=x-1;
            for(long long n=num>>i;n;n>>=x,i+=x){
                res+=(n/2)<<i;
                if(n%2){
                    long long mask=(1ll<<i)-1;
                    res+=(num&mask)+1;
                }
            }
            return res<=k;
        };
        long long left=0,right=((1+k)<<x)+1;
        while(left<=right){
            long long mid=left+(right-left)/2;
            if(check(mid)) left=mid+1;
            else right=mid-1;
        }
        return right;
    }
};
```
前导零

[2376. 统计特殊整数](https://leetcode.cn/problems/count-special-integers/)

```c++
class Solution {
public:
    int countSpecialNumbers(int n) {
        string num=to_string(n);
        int m=num.size();
        vector<vector<int>> memo(m+1,vector<int>(1<<10,-1));
        auto dfs=[&](auto&& dfs,int i,int mask,bool islimit,bool isnum)->int{
            if(i==m) return isnum;
            if(!islimit&&isnum&&memo[i][mask]!=-1) return memo[i][mask];

            int up=islimit?num[i]-'0':9;
            int ans=0;
            if(!isnum) ans=dfs(dfs,i+1,mask,false,false);
            for(int nxt=isnum?0:1;nxt<=up;nxt++){
                if(((mask>>nxt)&1)==0){
                    ans+=dfs(dfs,i+1,mask|(1<<nxt),islimit&&nxt==up,true);
                }
            }
            if(!islimit&&isnum) memo[i][mask]=ans;
            return ans;
        };
        return dfs(dfs,0,0,true,false);
    }
};

```



**数位DP v2.0**

上面的是只有一个上界的DP问题，如果是求一个范围内的个数，例如[low,high]会要算两次。f[high]-f[low-1]。考虑下界的数位DP模板。



**基础版**：`dfs(int i,bool limit_low, bool limit_high)`

```python
# 这一段不能变，保证遍历对象在范围内。不考虑其他的限制条件
lo = int(low[i]) if limit_low else 0
hi = int(high[i]) if limit_high else 9

# 最初调用时：
dfs(0,True,True)
```

[2999. 统计强大整数的数目](https://leetcode.cn/problems/count-the-number-of-powerful-integers/)



**前导零版**：`dfs(int i,bool limit_low, bool limit_high, bool is_num)`

```python
# is_num 前面是否填了非零的数
# 如果要统计与填入数据长度有关的信息。必须有一个参数来表示长度/前面有没有填0


# 最初调用时：
dfs(0,True,True,False)
```

[2827. 范围中美丽整数的数目](https://leetcode.cn/problems/number-of-beautiful-integers-in-the-range/)


## 换根DP

> 换根DP是树形DP的一种，又叫二次扫描
> 特点：
> 1. 以树上不同的节点为根，答案不同
> 2. 要求解树上每个节点的某个信息
> 3. 一次扫描不够，需要两次扫描

对于一个根可以DFS得到答案，但如果要对树的节点都得到这个答案的话，用n次DFS效率太低了，这时可以考虑节点和节点之间有没有转化关系，想要利用这个转化关系得到答案要额外计算关于这个节点的什么信息。在第一次扫描的时候不仅要把一个节点的答案算出来，还要把这个信息算出来。第二次扫描的时候把答案扩散到其他节点。

最终考的还是树型DP的基本功



如果是平凡的图论问题考虑用Floyd算法$O(n^3)$，但是对于树形结构/无环结构，可以利用二次扫描优化到$O(n^2)$。

[834.树中距离之和](https://leetcode.cn/problems/sum-of-distances-in-tree/description/)
```c++
class Solution {
public:
    vector<int> sumOfDistancesInTree(int n, vector<vector<int>> &edges) {
        vector<vector<int>> g(n); // g[x] 表示 x 的所有邻居
        for (auto &e: edges) {
            int x = e[0], y = e[1];
            g[x].push_back(y);
            g[y].push_back(x);
        }

        vector<int> ans(n);
        vector<int> size(n, 1); // 注意这里初始化成 1 了，下面只需要累加儿子的子树大小
        function<void(int, int, int)> dfs = [&](int x, int fa, int depth) {
            ans[0] += depth; // depth 为 0 到 x 的距离
            for (int y: g[x]) { // 遍历 x 的邻居 y
                if (y != fa) { // 避免访问父节点
                    dfs(y, x, depth + 1); // x 是 y 的父节点
                    size[x] += size[y]; // 累加 x 的儿子 y 的子树大小
                }
            }
        };
        dfs(0, -1, 0); // 0 没有父节点

        function<void(int, int)> reroot = [&](int x, int fa) {
            for (int y: g[x]) { // 遍历 x 的邻居 y
                if (y != fa) { // 避免访问父节点
                    ans[y] = ans[x] + n - 2 * size[y];
                    reroot(y, x); // x 是 y 的父节点
                }
            }
        };
        reroot(0, -1); // 0 没有父节点
        return ans;
    }
};
```

解答中关于size[]的处理，这里可以联想到二叉树的前中后序遍历，先递归，size[y]一定被计算好了，边界条件处理好了，中间的逻辑（自己1+所有子树的节点数）没错，这样写就没问题。这个size[]的处理可以记住。

[100392. 标记所有节点需要的时间](https://leetcode.cn/problems/time-taken-to-mark-all-nodes/) 

```c++
class Solution {
public:
    vector<int> timeTaken(vector<vector<int>>& edges) {
        //换根DP->两次DFS
        int n=edges.size()+1;
        vector<vector<int>> g(n);
        for(auto &e:edges){
            g[e[0]].push_back(e[1]);
            g[e[1]].push_back(e[0]);
        }
        int f[n];
        auto dfs1=[&](auto&& self,int sn,int fa)->int{
            f[sn]=0;
            for(int nx:g[sn]) if(nx!=fa){
                int t=self(self,nx,sn)+2-nx%2;
                f[sn]=max(f[sn],t);
            }
            return f[sn];
        };
        dfs1(dfs1,0,-1);
        vector<int> ans(n);
        auto dfs2=[&](auto&& self,int sn,int fa,int fv)->void{
            ans[sn]=max(f[sn],fv);
            int mx1=-1,fn1=-1,mx2=-1,fn2=-1;
            for(int fn:g[sn]) if(fn!=fa){
                int t=f[fn]+2-fn%2;
                if(t>mx1) fn2=fn1,mx2=mx1,fn1=fn,mx1=t;
                else if(t>mx2) fn2=fn,mx2=t;
            }
            for(int fn:g[sn]) if(fn!=fa){
                int t;
                if(fn1==fn) t=max(fv,mx2);
                else t=max(fv,mx1);
                self(self,fn,sn,t+2-sn%2);
            }
        };
        dfs2(dfs2,0,-1,0);
        return ans;
    }
};
```
[310. 最小高度树](https://leetcode.cn/problems/minimum-height-trees/) 

```c++
// height0 表示子树高
// height 表示树高

class Solution {
public:
    // dfs1 计算以 0 号节点为根的树中，以各个节点为根的子树高
    void dfs1(vector<vector<int>>& graph, vector<int>& height0, int u) {
        height0[u] = 1;
        int h = 0;
        for (int v : graph[u]) {
            if (height0[v] != 0) continue;
            dfs1(graph, height0, v);
            h = max(h, height0[v]);
        }
        height0[u] = h + 1;
    }

    // dfs2 进行换根动态规划，计算出所有的树高
    void dfs2(vector<vector<int>>& graph, vector<int>& height0, vector<int>& height, int u) {
        // 计算子树高的最大值和次大值
        int first = 0;
        int second = 0;
        for (int v : graph[u]) {
            if (height0[v] > first) {
                second = first;
                first = height0[v];
            } else if (height0[v] > second)
                second = height0[v];
        }
        height[u] = first + 1;
        for (int v : graph[u]) {
            // 树高已计算，跳过这个节点
            if (height[v] != 0) continue;
            // 更新以当前节点为根的子树高，换根到 v
            height0[u] = (height0[v] != first ? first : second) + 1;
            // 这句代码和前面的 height[u] = first + 1 保留一个即可
            // height[v] = max(height0[v], height0[u] + 1);
            // 递归进行换根动态规划
            dfs2(graph, height0, height, v);
        }
    }

    vector<int> findMinHeightTrees(int n, vector<vector<int>>& edges) {
        vector<vector<int>> graph(n);
        for (const auto& e : edges) {
            graph[e[0]].push_back(e[1]);
            graph[e[1]].push_back(e[0]);
        }
        vector<int> height0(n, 0);
        vector<int> height(n, 0);
        dfs1(graph, height0, 0);
        dfs2(graph, height0, height, 0);
        vector<int> ans;
        int h = n;
        for (int i = 0;i < n;++i) {
            if (height[i] < h) {
                h = height[i];
                ans.clear();
            }
            if (height[i] == h)
                ans.push_back(i);
        }
        return ans;
    }
};

```

## 全排列搜索中的记忆化搜索

[3533](https://leetcode.cn/problems/concatenated-divisibility/) 给定一个数组，求一个排列，使得拼接后可以被k整除，求字典序最小的排列。（并非排列后字符串的字典序，而是针对排列每个位置的数值大小）

思路是全排列暴搜，先将数值排序元素，从前往后选择，找到第一个符合整除条件的排列直接返回。

这种情况下如何使用记忆化搜索呢？和一般的DP不同，这不是返回子问题的结果，全排列的遍历是一个经典的回溯过程，似乎不能记忆化搜索。

本题中可能出现重复的情况是：前x个数选择一样，排序不同且运算结果res相同，后面就不要重复回溯遍历了。



```c++
class Solution {
public:
    vector<int> concatenatedDivisibility(vector<int>& nums,
     int k) {
        ranges::sort(nums);
        int n=nums.size();
        vector<int> pow10(n);
        for(int i=0;i<n;i++){
            pow10[i]=pow(10,to_string(nums[i]).size());
        }

        vector vis(1<<n,vector<bool>(k));
        vector<int> ans;
        auto dfs=[&](this auto&& dfs, int res, int mask)->bool{
            if(mask==0){
                return res==0;
            }
            if(vis[mask][res]) return false;
            vis[mask][res]=true;
            for(int i=0;i<n;i++){
                if(mask&(1<<i)&&
                dfs((res*pow10[i]+nums[i])%k,mask^(1<<i))){
                    ans.push_back(nums[i]);
                    return true;
                }
            }
            return false;
        };

        if(!dfs(0,(1<<n)-1)){
            return {};
        }
        ranges::reverse(ans);
        return ans;
    }
};
```



## DP优化

**空间优化**看状态转移方向。如果你要用到**更新前**的左边的数据那就**从右到左/倒序**，如果你要用到**更新后**的左边的数据那就是**从左到右/正序**。

在很多情况下，以位置为DP依据都可以简化掉，并不是必要的。



1. 前缀和优化
[100396. 单调数组对的数目 II](https://leetcode.cn/problems/find-the-count-of-monotonic-pairs-ii/)

状态转移有这种大规模求和时：
```c++
for(int x=down;x<=nums[i];x++){
    res=(res+self(self,i+1,x)%mod)%mod;
}

//如何从记忆化搜索到递推：思考后一个数填了j，上一个数可以填什么。
int up=0;
if(i>0) up=min(x,x+nums[i-1]-nums[i]);
for(int shang=0; shang<=up ;shang++){
    f[i+1][x]=(f[i+1][x]+f[i][shang])%mod;
}
```

题解：还是比较容易实现的
```c++
class Solution {
public:
    int countOfPairs(vector<int>& nums) {
        int n=nums.size(),mx=ranges::max(nums);
        int f[n+1][mx+1];
        int suf[n+1][mx+2];
        int mod=1e9+7;
        memset(f,0,sizeof(f));
        memset(suf,0,sizeof(suf));
        for(int j=0;j<=mx;j++) {
            f[0][j]=1;
            suf[0][j+1]=(suf[0][j]+f[0][j])%mod;
        }
        for(int i=0;i<n;i++){
            for(int x=0;x<=nums[i];x++){
                int up=0;
                if(i>0) up=min(x,x+nums[i-1]-nums[i]);
                if(up>=0){
                    f[i+1][x]=suf[i][up+1];
                    suf[i+1][x+1]=(suf[i+1][x]+f[i+1][x])%mod;
                }
            }
        }
        return suf[n][nums.back()+1];
    }
};
```
前缀和优化的推广：
各个状态之间是否有重叠的部分？能否充分利用？
其实就是将**已经更新的状态**认为是前缀和数组

[2902. 和带限制的子多重集合的数目](https://leetcode.cn/problems/count-of-sub-multisets-with-bounded-sum/) 
```c++
class Solution {
public:
    int countSubMultisets(vector<int>& nums, int l, int r) {
        int mod=1e9+7;
        unordered_map<int,int> cnt;
        int total=0;
        for(int n:nums){
            total+=n;
            cnt[n]++;
        }
        if(l>total) return 0;
        r=min(total,r);
        
        vector<int> dp(r+1);
        dp[0]=1+cnt[0];
        cnt.erase(0);

        int sum=0;
        for(auto& [cost,count]:cnt){
            auto f=dp;
            sum=min(r,sum+cost*count);
            for(int j=cost;j<=sum;++j){
                f[j]=(f[j]+f[j-cost])%mod;
                if(j>=(count+1)*cost){
                    f[j]=(f[j]-dp[j-(count+1)*cost]+mod)%mod;
                }
            }
            dp=move(f);
        }
        int ans=0;
        for(int i=l;i<=r;++i){
            ans=(ans+dp[i])%mod;
        }
        return ans;
    }
};

```

同余前缀和

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311504901.png)


2. 自定义数据结构


开辟新空间存储状态转移所需的数据，例如：存下最大和第二大的情况（换根DP里见过）。
> 这个方法可以看成是前缀和的推广，DP优化的本质。

[3177. 求出最长好子序列 II](https://leetcode.cn/problems/find-the-maximum-length-of-a-good-subsequence-ii/) 

定义`dfs(x,j)`表示**遍历到x时**，**至多**破了j次例的答案。这里事实上两个状态参数都是模糊的，x不一定就是选中的，j也是不一定都用上了。

状态转移时要知道`dfs(y,j-1)`遍历去寻找的话会TLE，可以开辟一片新的空间，在状态转移（遍历各个情况时）更新这个空间，之后状态转移时只需查询这篇空间里的数据，而无需重新遍历一次去寻找。

```c++
class Solution {
public:
    int maximumLength(vector<int>& nums, int k) {
        unordered_map<int,vector<int>> fs;
        vector<array<int,3>> records(k+1);
        for(int x:nums){
            auto& f=fs[x];
            f.resize(k+1);
            for(int j=k;j>=0;--j){
                f[j]++;
                if(j){
                    auto &r=records[j-1];
                    int mx=r[0],mx2=r[1],num=r[2];
                    f[j]=max(f[j],(x!=num?mx:mx2)+1);
                }

                int v=f[j];
                auto& p=records[j];
                if(v>p[0]){
                    if(x!=p[2]){
                        p[2]=x;
                        p[1]=p[0];
                    }
                    p[0]=v;
                }else if(x!=p[2]&&v>p[1]){
                    p[1]=v;
                }
            }
        }
        return records[k][0];
    }
};
```
思考下列解法为什么超时：
```c++
class Solution {
public:
    int maximumLength(vector<int>& nums, int k) {
        int n=nums.size();
        unordered_map<int,int> memo;
        auto dfs=[&](auto &&dfs,int i,int res,int qian)->int{
            if(i==n) return 0;
            int mask=i|(qian<<9)|(res<<18);
            if(memo.count(mask)) return memo[mask];
            int ans=0;
            if(qian==-1){
                //xuan
                ans=max(ans,dfs(dfs,i+1,res,i)+1);

                //buxuan
                ans=max(ans,dfs(dfs,i+1,res,qian));
            }else{
                if(nums[i]==nums[qian]){
                    ans=max(ans,dfs(dfs,i+1,res,i)+1);
                }else{
                    //xuan
                    if(res>0){
                        ans=max(ans,dfs(dfs,i+1,res-1,i)+1);
                    }
                    //buxuan
                    ans=max(ans,dfs(dfs,i+1,res,qian));
                }
            }
            memo[mask]=ans;
            return ans;
        };
        return dfs(dfs,0,k,-1);
    }
};
```
我的理解是：`case(i,res,qian)`是不会重复遇到的，这样做相当于暴力回溯。所以对于一些问题，将状态参数设置为模糊是必要的。

3. bitset优化

   在一些问题里，DP状态值的定义可能是true和false，这可以考虑用一个二进制数来表示DP数组来节省空间。
```c++
bitset<100000> f{1};

f.test(i); //表示访问第i位，从右到左
//二进制高位在左边，和数组不太一样
```

[3181. 执行操作可获得的最大总奖励 II](https://leetcode.cn/problems/maximum-total-reward-using-operations-ii/) 

4. 矩阵快速幂优化DP

[3337](https://leetcode.cn/problems/total-characters-in-string-after-transformations-ii/description/?envType=daily-question&envId=2025-05-14)字符串替换后长度。字母有一个变化规则，给定一个字符串和变化次数，返回变化后字符串的长度。

DP思路：
```c++
for(int i=1;i<=t;i++){
    for(int j=0;j<26;j++){
        f[j][i]=0;
        for(int k=1;k<=nums[j];k++){
            f[j][i]=(f[j][i]+f[(j+k)%26][i-1])%mod;
        }
    }
}
```
t的范围是$10^9$，所以哪怕前缀和优化后时间复杂度为$O(26t)$也不满足条件。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311549422.png)

注意下面的矩阵乘法的优化写法。
```c++
class Solution {
    static constexpr int MOD = 1'000'000'007;
    static constexpr int SIZE = 26;

    using Matrix = array<array<int, SIZE>, SIZE>;

    // 返回矩阵 a 和矩阵 b 相乘的结果
    Matrix mul(Matrix& a, Matrix& b) {
        Matrix c{};
        for (int i = 0; i < SIZE; i++) {
            for (int k = 0; k < SIZE; k++) {
                if (a[i][k] == 0) {
                    continue;
                }
                for (int j = 0; j < SIZE; j++) {
                    c[i][j] = (c[i][j] + (long long) a[i][k] * b[k][j]) % MOD;
                }
            }
        }
        return c;
    }

    // 返回 n 个矩阵 a 相乘的结果
    Matrix pow(Matrix a, int n) {
        Matrix res = {};
        for (int i = 0; i < SIZE; i++) {
            res[i][i] = 1; // 单位矩阵
        }
        while (n) {
            if (n & 1) {
                res = mul(res, a);
            }
            a = mul(a, a);
            n >>= 1;
        }
        return res;
    }

public:
    int lengthAfterTransformations(string s, int t, vector<int>& nums) {
        Matrix m{};
        for (int i = 0; i < SIZE; i++) {
            for (int j = i + 1; j <= i + nums[i]; j++) {
                m[i][j % SIZE] = 1;
            }
        }
        Matrix mt = pow(m, t);

        int cnt[SIZE]{};
        for (char c : s) {
            cnt[c - 'a']++;
        }

        long long ans = 0;
        for (int i = 0; i < SIZE; i++) {
            // m 第 i 行的和就是 f[t][i]
            ans += reduce(mt[i].begin(), mt[i].end(), 0LL) * cnt[i];
        }
        return ans % MOD;
    }
};
```

## 状态更新

DP问题状态更新并不是死板的遍历参数，套用状态转移方程就可以了。


1. 刷表法，填表法

   [3291. 形成目标字符串需要的最少字符串数 I](https://leetcode.cn/problems/minimum-number-of-valid-strings-to-form-target-i/)

   简单版本的问题可以用tire加DP暴力过，但是我一直尝试从之前的状态转移过来，一直优化一直TLE，这里应该采用刷表法的思想，从当前状态考虑所有的未来状态并更新未来状态。

   另外向前枚举也不能体现字典树的优势，因为开头一直在变，而字典树之所以能优化搜索就是利用了前缀相同的性质。
   
   为什么刷表法与填表法等价？

2. 图论DP状态更新

   [3243. 新增道路查询后的最短距离 I](https://leetcode.cn/problems/shortest-distance-after-road-addition-queries-i/)

   这道题暴力用BFS能过，比赛的时候一直想着用DP方法，但是不知道怎么状态转移。首先添加一条边的影响只会影响后一个节点及以后的节点的答案。比较所有的前一个相连的点的大小即可。

   [1928. 规定时间内到达终点的最小花费](https://leetcode.cn/problems/minimum-cost-to-reach-destination-in-time/)

   这道题并没有挨个节点去遍历，而是去遍历节点之间的关系。
   遍历两层节点+判断是否相连+判断是否更新 `->` 直接遍历相连关系+判断是否更新

3. 并非明显的子问题

   [3193. 统计逆序对的数目](https://leetcode.cn/problems/count-the-number-of-inversions/)
   
   考虑第`i`位填什么，剩下的数字，一定有一个排序，所以贡献k可以从0（选剩下的最大的）到`i-1`（选剩下最小的）。所以不必关心之前选了什么，也不必担心所有的这些情况能不能取到。
   还有一个计数的问题，”逆序对“只需要计算一边，也就是对于`i`只需考虑`j>i`。
   1-n的perm，和缺斤少两的1-n的perm，和1-m的perm，在逆序对上没有区别，这就是为什么能够转化为子问题。
