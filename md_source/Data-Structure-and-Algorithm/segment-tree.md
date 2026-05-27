# 线段树

## 基础
线段树是算法竞赛中常用的用来维护 **区间信息** 的数据结构。

线段树可以在 $O(logN)$的时间复杂度内实现单点修改、区间修改、区间查询（区间求和，求区间最大值，求区间最小值)等操作。

**建树**
```c++
void build(int s, int t, int p) {
  // 对 [s,t] 区间建立线段树,当前根的编号为 p
  if (s == t) {
    d[p] = a[s];
    return;
  }
  int m = s + ((t - s) >> 1);
  // 移位运算符的优先级小于加减法，所以加上括号
  // 如果写成 (s + t) >> 1 可能会超出 int 范围
  build(s, m, p * 2), build(m + 1, t, p * 2 + 1);
  // 递归对左右区间建树
  d[p] = d[p * 2] + d[(p * 2) + 1];
}
```
建树怎么调用？
```c++
int n = heights.size();
mx.resize(4 << __lg(n));
build(1, 0, n - 1, heights);
```
**查询**
```c++
int getsum(int l, int r, int s, int t, int p) {
  // [l, r] 为查询区间, [s, t] 为当前节点包含的区间, p 为当前节点的编号
  if (l <= s && t <= r)
    return d[p];  // 当前区间为询问区间的子集时直接返回当前区间的和
  int m = s + ((t - s) >> 1), sum = 0;
  if (l <= m) sum += getsum(l, r, s, m, p * 2);
  // 如果左儿子代表的区间 [s, m] 与询问区间有交集, 则递归查询左儿子
  if (r > m) sum += getsum(l, r, m + 1, t, p * 2 + 1);
  // 如果右儿子代表的区间 [m + 1, t] 与询问区间有交集, 则递归查询右儿子
  return sum;
}
```
查询怎么调用？一开始p设置为1，s设为0，t设为n-1 。l和r设为需要查询的范围即可。

**区间增加+查询**、**延迟修改，惰性标记**
```c++
void update(int l, int r, int c, int s, int t, int p) {
  // [l, r] 为修改区间, c 为被修改的元素的变化量, [s, t] 为当前节点包含的区间, p
  // 为当前节点的编号
  if (l <= s && t <= r) {
    d[p] += (t - s + 1) * c, b[p] += c;
    return;
  }  // 当前区间为修改区间的子集时直接修改当前节点的值,然后打标记,结束修改
  int m = s + ((t - s) >> 1);
  if (b[p] && s != t) {
    // 如果当前节点的懒标记非空,则更新当前节点两个子节点的值和懒标记值
    d[p * 2] += b[p] * (m - s + 1), d[p * 2 + 1] += b[p] * (t - m);
    b[p * 2] += b[p], b[p * 2 + 1] += b[p];  // 将标记下传给子节点
    b[p] = 0;                                // 清空当前节点的标记
  }
  if (l <= m) update(l, r, c, s, m, p * 2);
  if (r > m) update(l, r, c, m + 1, t, p * 2 + 1);
  d[p] = d[p * 2] + d[p * 2 + 1];
}

int getsum(int l, int r, int s, int t, int p) {
  // [l, r] 为查询区间, [s, t] 为当前节点包含的区间, p 为当前节点的编号
  if (l <= s && t <= r) return d[p];
  // 当前区间为询问区间的子集时直接返回当前区间的和
  int m = s + ((t - s) >> 1);
  if (b[p]) {
    // 如果当前节点的懒标记非空,则更新当前节点两个子节点的值和懒标记值
    d[p * 2] += b[p] * (m - s + 1), d[p * 2 + 1] += b[p] * (t - m);
    b[p * 2] += b[p], b[p * 2 + 1] += b[p];  // 将标记下传给子节点
    b[p] = 0;                                // 清空当前节点的标记
  }
  int sum = 0;
  if (l <= m) sum = getsum(l, r, s, m, p * 2);
  if (r > m) sum += getsum(l, r, m + 1, t, p * 2 + 1);
  return sum;
}
```
**区间修改+查询**
```c++
void update(int l, int r, int c, int s, int t, int p) {
  if (l <= s && t <= r) {
    d[p] = (t - s + 1) * c, b[p] = c, v[p] = 1;
    return;
  }
  int m = s + ((t - s) >> 1);
  // 额外数组储存是否修改值
  if (v[p]) {
    d[p * 2] = b[p] * (m - s + 1), d[p * 2 + 1] = b[p] * (t - m);
    b[p * 2] = b[p * 2 + 1] = b[p];
    v[p * 2] = v[p * 2 + 1] = 1;
    v[p] = 0;
  }
  if (l <= m) update(l, r, c, s, m, p * 2);
  if (r > m) update(l, r, c, m + 1, t, p * 2 + 1);
  d[p] = d[p * 2] + d[p * 2 + 1];
}

int getsum(int l, int r, int s, int t, int p) {
  if (l <= s && t <= r) return d[p];
  int m = s + ((t - s) >> 1);
  if (v[p]) {
    d[p * 2] = b[p] * (m - s + 1), d[p * 2 + 1] = b[p] * (t - m);
    b[p * 2] = b[p * 2 + 1] = b[p];
    v[p * 2] = v[p * 2 + 1] = 1;
    v[p] = 0;
  }
  int sum = 0;
  if (l <= m) sum = getsum(l, r, s, m, p * 2);
  if (r > m) sum += getsum(l, r, m + 1, t, p * 2 + 1);
  return sum;
}
```



## 例题
[2940. 找到 Alice 和 Bob 可以相遇的建筑](https://leetcode.cn/problems/find-building-where-alice-and-bob-can-meet/)
**线段树建树+查询** 理清楚了递归就能做

```c++
class Solution {
    vector<int> mx;
    

    void build(int o,int l,int r,vector<int> &heights){
        if(l==r) {
            mx[o]=heights[l];
            return;
        }
        int m=(l+r)/2;
        build(2*o,l,m,heights);
        build(2*o+1,m+1,r,heights);
        mx[o]=max(mx[2*o],mx[2*o+1]);

    }
	
    int query(int o,int l,int r,int L,int v){
        if(mx[o]<=v) return -1;
        if(l==r) return l;
        int m=(l+r)/2;
        if(L<=m){
            int pos=query(2*o,l,m,L,v);
            if(pos>0) return pos;
        }
        return query(2*o+1,m+1,r,L,v);
    }
public:
    vector<int> leftmostBuildingQueries(vector<int>& heights, vector<vector<int>>& queries) {
        int n=heights.size();
        mx.resize(4<<__lg(n));
        build(1,0,n-1,heights);

        vector<int> ans;
        for(auto &q:queries){
            int a=q[0],b=q[1];
            if(a>b) swap(a,b);
            if(a==b||heights[a]<heights[b]) ans.push_back(b);
            else ans.push_back(query(1,0,n-1,b+1,heights[a]));
        }
        return ans;
    }
};
```



[3165. 不包含相邻元素的子序列的最大和](https://leetcode.cn/problems/maximum-sum-of-subsequence-with-non-adjacent-elements/)
n次修改+打家劫舍（不能取相邻的数字）直接DP复杂度在$O(n^2)$。

使用**分治+线段树**优化，分治思想（算法）和线段树（数据结构）不谋而合。线段树用分治的思想维护了某区间的某性质。
**分治思想**：将问题分为前后两半解决

本题还涉及到线段树的**单点修改**。和build的结构相似，最后一定要更新当前的节点。
```c++
class Solution {
    vector<array<unsigned int,4>> t;

    void maintain(int o){
        auto& a=t[2*o],b=t[2*o+1];
        t[o]={
            max(a[0]+b[2],a[1]+b[0]),
            max(a[0]+b[3],a[1]+b[1]),
            max(a[2]+b[2],a[3]+b[0]),
            max(a[2]+b[3],a[3]+b[1])
        };
    }

    void build(int o,int l,int r,vector<int>& nums){
        if(l==r){
            t[o][3]=max(nums[l],0);
            return;
        }
        int m=(l+r)/2;
        build(2*o,l,m,nums);
        build(2*o+1,m+1,r,nums);
        maintain(o);
    }

    void update(int o,int l,int r,int i,int val){
        if(l==r){
            t[o][3]=max(val,0);
            return;
        }
        int m=(l+r)/2;
        if(i<=m){
            update(2*o,l,m,i,val);
        }else update(2*o+1,m+1,r,i,val);
        maintain(o); //?
    }
public:
    int maximumSumSubsequence(vector<int>& nums, vector<vector<int>>& queries) {
        int n=nums.size();
        t.resize(4<<__lg(n));
        build(1,0,n-1,nums);
        long long ans=0;
        for(auto& q:queries){
            update(1,0,n-1,q[0],q[1]);
            ans+=t[1][3];
        }
        return ans%1000000007;
    }
};
```




[3161. 物块放置查询](https://leetcode.cn/problems/block-placement-queries/)

问题在于问题转化，频繁的修改和区间查询`->`线段树。那怎么转化呢？原数组是什么？


```c++
class Solution {
    vector<int> t;
	//一定是用o访问这个数组 Debug注意
    void update(int o,int l,int r,int i,int val){
        if(l==r) {
            t[o]=val;
            return;
        }
        int m=(l+r)/2;
        if(m>=i) update(o*2,l,m,i,val);
        else update(o*2+1,m+1,r,i,val);
        t[o]=max(t[2*o],t[2*o+1]);
    }
	//查询自由度很高，线段树本质是维护的工具
    //对于原数组的性质，查询范围，查询的性质没有限制
    int query(int o,int l,int r,int R){
        if(r<=R) return t[o];
        int m=(l+r)/2;
        if(m>=R) return query(2*o,l,m,R);
        return max(t[2*o],query(2*o+1,m+1,r,R));
    }
public:
    vector<bool> getResults(vector<vector<int>>& queries) {
        int m=0;
        for(auto& q:queries){
            m=max(m,q[1]);
        }
        ++m;
        t.resize(4<<__lg(m));
        set<int> st{0,m};
        vector<bool> ans;
        for(auto& q:queries){
            int x=q[1];
            auto it=st.lower_bound(x);
            int pre=*prev(it);
            if(q[0]==1){
                int nxt=*it;
                st.insert(x);
                update(1,0,m,x,x-pre);
                update(1,0,m,nxt,nxt-x);
            }else{
                int mx_gap=max(query(1,0,m,pre),x-pre);
                ans.push_back(mx_gap>=q[2]);
            }
        }
        return ans;
    }
};
```

### RMQ问题

RMQ (Range Minimum/Maximum Query) 查询，即区间最值查询。

常见的数据结构有：ST表、树状数组、线段树等。

#### ST表(Sparse Table稀疏表)

ST表$O(nlogn)$预处理，$O(1)$查询，$O(nlogn)$空间复杂度。**不支持修改**，每次修改需要重新建表。

问题举例：给定数组nums[n]，有m个询问，对于每个询问，需要回答区间[l,r]内的最大值。

ST表采用**倍增**思想，所谓倍增思想指的是线性递推复杂度过大，通过成倍增长方式获得k的整数幂次上的值为代表，对于任意值用若干k的整数幂次的和来表示。
倍增思想常用于RMQ、LCA（最近公共祖先）等问题的求解。

区间最大值是一个具有**可重复贡献**性质的问题，可以重复计算，满足性质$OP(x,x)=x$例如：$max(x,x)=x$、$gcd(x,x)=x$，于是可以选取有重叠部分的预处理区间构造询问区间的答案。

实现思想：
1. 令$f(i,j)$表示区间$[i,i+2^j-1]$的最大值
2. 初始化 $f(i,0)=a_i$
3. 状态转移方程 $f(i,j)=max(f(i,j-1),f(i+2^{j-1},j-1))$
4. 查询区间$[l,r]$的最大值，令$k=log_2(r-l+1)$，则答案为$max(f(l,k),f(r-2^k+1,k))$

c++模板：
```c++
template <typename T>
class ST{
public:
    const int n;
    vector<vector<T>> st;
    ST(int n = 0, vector<T> &a = {}) : n(n){
        st = vector(n + 1, vector<T>(22 + 1));
        build(n, a);
    }
 
    inline T get(const T &x, const T &y){
        return max(x, y);
    }
 
    void build(int n, vector<T> &a){
        for(int i = 1; i <= n; i++){
            st[i][0] = a[i];
        }
        for(int j = 1, t = 2; t <= n; j++, t <<= 1){
            for(int i = 1; i <= n; i++){
                if(i + t - 1 > n) break;
                st[i][j] = get(st[i][j - 1], st[i + (t >> 1)][j - 1]);
            }
        }
    }
 
    inline T find(int l, int r){
        int t = log(r - l + 1) / log(2);
        return get(st[l][t], st[r - (1 << t) + 1][t]);
    }
};
```

#### 树状数组FT(Fenwick Tree)

树状数组$O(nlogn)$预处理，$O(logn)$查询，$O(n)$空间复杂度。支持单点修改，区间查询。

Template：
```c++
struct FT {
	vector<int> s;
	FT(int n) : s(n) {}
	void update(int pos, int dif) { // a[pos] += dif
		for (; pos < sz(s); pos |= pos + 1) s[pos] += dif;
	}
	int query(int pos) { // sum of values in [0, pos)
		int res = 0;
		for (; pos > 0; pos &= pos - 1) res += s[pos-1];
		return res;
	}
	int lower_bound(int sum) {// min pos st sum of [0, pos] >= sum
		// Returns n if no sum is >= sum, or -1 if empty sum is.
		if (sum <= 0) return -1;
		int pos = 0;
		for (int pw = 1 << 25; pw; pw >>= 1) {
			if (pos + pw <= sz(s) && s[pos + pw-1] < sum)
				pos += pw, sum -= s[pos-1];
		}
		return pos;
	}
};
```

#### 线段树

线段树$O(n)$预处理，$O(logn)$查询，$O(n)$空间复杂度。支持单点修改，区间查询。
