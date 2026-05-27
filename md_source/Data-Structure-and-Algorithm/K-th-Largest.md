# K-th Largest

[toc]
</br>

## O(n)找到第K大的数

**快速选择算法**

模板题：
[215. 数组中的第K个最大元素](https://leetcode.cn/problems/kth-largest-element-in-an-array/description/)

分治思想，初始范围是[0,n-1]随机选一个数，确定它排序后的位置i（左边的数小于等于它，右边的数大于等于它，用双指针实现，交换左右指针指向的数据）
i如果等于K就找到了，否则k一定在[0,i-1]、[i+1,n-1]其中一个区间，$i<k$ 时K在后面区间，否则在前面区间，重复上述过程，即可找到。

随机选取i，评价视角下i会将父区间均分，每次遍历的数据量为：$n$、$\frac{n}{2}$、$\frac{n}{4}$、$\frac{n}{8}$，等比数量求和，最多遍历$2n$次，所以可以在$O(n)$的时间复杂度下找到第K大的元素。

这也是快速排序算法最难最核心的地方，我当时在计算机学院研究生面试时问了快速排序算法。

STL写法：
```cpp
ranges::nth_element(nums, nums.end() - k);
return nums[nums.size() - k];
```

## 动态维护中位数/第k大的数

这个算法似乎能在图形学中用到，我记得GAMES101闫令琪老师在讲几何处理的时候提到过这个算法。

思路：左边用最大堆维护，右边用最小堆维护，新**插入**一个数值比较一下左右堆顶值进行弹出插入操作。堆操作不支持随机删除，用到**延迟删除**，每一次操作结束后要保证当前堆顶是合法的。

**延迟删除**：用一个哈希表储存需要删除的数的个数，等遇到了再删除，省去了寻找的过程。

1. 每次pop操作后都要进行一次prune操作，防止下一个堆顶是已经被删除的元素。
2. 每次新增一个要删去的数，就要检查现在的堆顶是否要被删去。
   

python语言中`heappushpop`先进行`push`再进行`pop`这样可以省去判断，将维持平衡和比较大小放在一个`if`里。如果是奇数/偶数，先与right交换，插入left；反之亦然。

模板1（堆实现）：
```python
class MedianFinder:

    def __init__(self,k:int):
        self.left=[]
        self.right=[]
        self.k=k
        self.delayed=collections.Counter()
        self.leftsize=0
        self.rightsize=0
    def prune(self,heap:List[int]):
        while heap:
            num=heap[0]
            if heap is self.left:
                num=-num
            if num in self.delayed:
                self.delayed[num]-=1
                if self.delayed[num]==0:
                    self.delayed.pop(num)
                heappop(heap)
            else:
                break
    def makebalance(self):
        if self.leftsize>self.rightsize+1:
            heappush(self.right,-self.left[0])
            heappop(self.left)
            self.leftsize-=1
            self.rightsize+=1
            self.prune(self.left)
        elif self.leftsize<self.rightsize:
            heappush(self.left,-self.right[0])
            heappop(self.right)
            self.leftsize+=1
            self.rightsize-=1
            self.prune(self.right)
    def insert(self,num:int):
        if not self.left or num<=-self.left[0]:
            heappush(self.left,-num)
            self.leftsize+=1
        else:
            heappush(self.right,num)
            self.rightsize+=1
        self.makebalance()
    def erase(self,num:int):
        self.delayed[num]+=1
        if num<=-self.left[0]:
            self.leftsize-=1
            if num==-self.left[0]:
                self.prune(self.left)
        else:
            self.rightsize-=1
            if num==self.right[0]:
                self.prune(self.right)
        self.makebalance()
    def findMedian(self):
        if self.k%2:
            return -self.left[0]
        else:
            return (-self.left[0]+self.right[0])/2

```

中位数的本质是第n/2大的数，可以推广到动态维护第k大的数。

模板2（有序数组实现）

```python
from sortedcontainers import SortedList
class findkth:
    def __init__(self,k:int):
        self.k=k
        self.L=SortedList()
        self.R=SortedList()
        self.leftsum=0
    def L2R(self):
        x=self.L.pop()
        self.leftsum-=x
        self.R.add(x)
    def R2L(self):
        x=self.R.pop(0)
        self.leftsum+=x
        self.L.add(x)
    def makebalance(self):
        while len(self.L)>self.k:
            self.L2R()
        while len(self.L)<self.k:
            self.R2L()
    def initial_nums(self,nums:List[int]):
        self.L=SortedList(nums)
        self.leftsum=sum(nums)
        self.makebalance()
    def insert(self,n:int):
        if n<self.L[-1]:
            self.leftsum+=n
            self.L.add(n)
        else:
            self.R.add(n)
        self.makebalance()
    def erase(self,n:int):
        if n in self.L:
            self.leftsum-=n
            self.L.remove(n)
        else:
            self.R.remove(n)
        self.makebalance()

```
模板3（multiset实现）
```c++
class findkth{
public:
    int k;
    long long leftsum=0;
    multiset<int> L,R;
public:
    findkth(int k):k(k){}
    void L2R(){
        int x=*L.rbegin();
        leftsum-=x;
        L.erase(L.find(x));
        R.insert(x);
    }
    void R2L(){
        int x=*R.begin();
        leftsum+=x;
        R.erase(R.find(x));
        L.insert(x);
    }
    void makebalance(){
        while(L.size()>k){
            L2R();
        }
        while(L.size()<k){
            R2L();
        }
    }
    void initial_nums(vector<int>nums){
        L=multiset<int>(nums.begin(),nums.end());
        leftsum=accumulate(nums.begin(),nums.end(),0ll);
        makebalance();
    }
    void insert(int n){
        if(n<*L.rbegin()){
            leftsum+=n;
            L.insert(n);
        }else{
            R.insert(n);
        }
        makebalance();
    }
    void erase(int n){
        auto it=L.find(n);
        if(it!=L.end()){
            leftsum-=n;
            L.erase(it);
        }else{
            R.erase(R.find(n));
        }
        makebalance();
    }

};
```

模板三（对顶堆 multiset）

[3321. 计算子数组的 x-sum II](https://leetcode.cn/problems/find-x-sum-of-all-k-long-subarrays-ii/)

```c++
// 对顶堆模板开始，注意以下模板维护的其实是前 K 小的元素

struct Magic {
    int K;
    typedef pair<int, int> pii;
    multiset<pii> st1, st2;
    long long sm1;

    Magic(int K): K(K) {
        sm1 = 0;
    }

    // 把第一个堆的大小调整成 K
    void adjust() {
        while (!st2.empty() && st1.size() < K) {
            pii p = *(st2.begin());
            st1.insert(p); sm1 += 1LL * p.first * p.second;
            st2.erase(st2.begin());
        }
        while (st1.size() > K) {
            pii p = *prev(st1.end());
            st2.insert(p);
            st1.erase(prev(st1.end())); sm1 -= 1LL * p.first * p.second;
        }
    }

    // 加入元素 p
    //必须考虑容器为空的情况，这是针对这个问题，入队的不是元素，而是出现次数
    //对pair或结构体，不能只比第一个。
    void add(pii p) {
        if (!st2.empty() && p >= *(st2.begin())) st2.insert(p);
        else st1.insert(p), sm1 += 1LL * p.first * p.second;
        adjust();
    }

    // 删除元素 p
    void del(pii p) {
        auto it = st1.find(p);
        if (it != st1.end()) st1.erase(it), sm1 -= 1LL * p.first * p.second;
        else st2.erase(st2.find(p));
        adjust();
    }
};
```

如果只有增加而没有删减，只用优先队列即可。这样可以减小开销。但是一旦有删减，就要用multiset。
