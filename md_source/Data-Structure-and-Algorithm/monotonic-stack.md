# 单调栈
单调栈不仅能够做到减少遍历次数（及时去掉无用信息），还能得到具有优良性质（单调性）的数组，进行高效的查找（二分）。

单调栈可以在$O(n)$内算出每个节点左右最近的（大于，大于等于，小于，小于等于）**位置**。

单调栈内存储的是数组的下标或**位置**，下标对应的数值是单调的。

1. **下一个**

栈存下标，比较数组大小。遍历方向决定储存下标的含义：操作对象候补、操作结果候补。

思考模板：
1. （操作对象候补  **||**  顺序）一段连续不符合要求的数+一个符合要求的数，来确定栈中各元素是如何找到答案的，到哪一步停止。
2. （操作结果候补  **||**  逆序）判断栈中哪些元素之后不可能用到了。如果遇到了一个更好的下标（更近&&更大），之前遇到的遇到的一些结果可能就用不上了。
```python
st=[]
ans=[0]*len(temperatures)
for i,t in enumerate(temperatures):
    while st and temperatures[st[-1]]<t:
        ans[st[-1]]=i-st[-1]
        st.pop()
    st.append(i)
    return ans
```

题目：

[2940. 找到 Alice 和 Bob 可以相遇的建筑](https://leetcode.cn/problems/find-building-where-alice-and-bob-can-meet/)

这道题经过贪心简化后，可以转化为**快速得出某个下标后最近的的下标使得h[j]>h[i]**那就是单调栈的**下一个**的模型。

这个问题还有一个技巧，因为是查询问题，处理一个个查询还要遍历数组维护单调栈，程序实现起来有点复杂。这里将一个个的查询转换到数组元素上，遍历数组维护单调栈的同时看该节点是否有查询的需要。

```c++
class Solution {
public:
    vector<int> leftmostBuildingQueries(vector<int>& heights, vector<vector<int>>& queries) {
        vector<int> ans(queries.size());
        vector<vector<pair<int, int>>> qs(heights.size());
        for (int i = 0; i < queries.size(); i++) {
            int a = queries[i][0], b = queries[i][1];
            if (a > b) {
                swap(a, b); // 保证 a <= b
            }
            if (a == b || heights[a] < heights[b]) {
                ans[i] = b; // i 直接跳到 j
            } else {
                qs[b].emplace_back(heights[a], i); // 离线询问
            }
        }

        vector<int> st;
        for (int i = heights.size() - 1; i >= 0; i--) {
            for (auto& [ha, qi] : qs[i]) {
                // 取反后，相当于找 < -ha 的最大下标，这可以先找 >= -ha 的最小下标，然后减一得到
                auto it = ranges::lower_bound(st, -ha, {}, [&](int j) { return -heights[j]; });
                ans[qi] = it > st.begin() ? *prev(it) : -1;
            }
            while (!st.empty() && heights[i] >= heights[st.back()]) {
                st.pop_back();
            }
            st.push_back(i);
        }
        return ans;
    }
};
```

2. **最远/最后一个**

总体最长：先从左到右遍历一次，找到所有可能的左端点，再从右到左遍历一次。有点像接雨水**双指针**的思想。(相当于对每个右端求最远，然后取最大，中间用单调栈去掉无用信息)
```python
st=[0]
n=len(nums)
for i in range(n):
	if nums[i]<nums[st[-1]]:st.append(i)
ans=0
for i in range(n-1,-1,-1):
	if not st:break 
	while st and nums[i]>=nums[st[-1]]:
		ans=max(ans,i-st.pop())
```

涉及到以下可以使用单调栈
> 上一个更大（小）的数
> 下一个更大（小）的数



**找数：**
>及时去掉无用数据，保证栈中数据有序。

**填坑：**
>找上一个更大元素，在找的过程中填坑。

单调栈，栈里面存的是下标，值可以通过下标访问到，入栈出栈的判断是和栈顶的值比较大小。
#### 单调栈基本
框架：
```c++
int st[n],ans[n],top=-1;
for(int i=0;i<n;i++){//从左到右遍历
	while(top!=-1 && nums[i]>nums[st[top]]){ //栈不为空且满足出栈条件
		int j=st[top];//栈顶元素，即下标
		top--;//出栈
		ans[j]=;//计算答案
	}
	top++;
	st[top]=i;//此时一定满足入栈条件了
}
```

#### 矩形系列
计算left、right数组
```c++
vector<int> left(n, -1);
stack<int> st;
for (int i = 0; i < n; i++) {
    while (!st.empty() && heights[i] <= heights[st.top()]) {
        st.pop();//高于现在的，之后都用不着判断了，属于无用数据
    }
    if (!st.empty()) {
        left[i] = st.top();
    }
    st.push(i);
}
vector<int> right(n, n);
st = stack<int>();
for (int i = n - 1; i >= 0; i--) {
    while (!st.empty() && heights[i] <= heights[st.top()]) {
	    st.pop();
    }
    if (!st.empty()) {
    	right[i] = st.top();
    }
    st.push(i);
}


```

这道题就是单调栈：[1673. 找出最具竞争力的子序列](https://leetcode.cn/problems/find-the-most-competitive-subsequence/)