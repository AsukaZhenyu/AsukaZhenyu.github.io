## 正难则反



#### 对偶

当题目要求计算最大值，DP时可以同时维护最大值和最小值。
1. 连乘但是其中有负数（会颠覆）

   难点就在于怎么推导状态转移方程。
   [152. 乘积最大子数组](https://leetcode.cn/problems/maximum-product-subarray/)
   
   f1[i]表示以i结尾的最大连乘，f2[i]表示以i结尾的最小连乘，fmax表示答案。
   
   如果`nums[i]>0 f1[i]=max(nums[i],f1[i-1]*nums[i]) f2[i]=min(nums[i],f2[i-1]*nums[i])`
   
   如果`nums[i]=0 f1[i]=0 f2[i]=0`
   
   如果`nums[i]<0 f1[i]=max(nums[i],f2[i-1]*nums[i]) f2[i]=min(nums[i],f1[i-1]*nums[i])`
   
   至于为什么状态转移方程是这样的，试着用排除法来理解一下。



#### 求反

1. 环形数组求最大，转换为：线性数组求最大最小。

   正面思考DP，可能会想多加一维记录开始的点。
   [918. 环形子数组的最大和](https://leetcode.cn/problems/maximum-sum-circular-subarray/)
   
2. 去除多少元素`->`保留多少元素

   [2009. 使数组连续的最少操作数](https://leetcode.cn/problems/minimum-number-of-operations-to-make-array-continuous/)

   因为要考虑到去重，考虑保留多少会更方便。
   
   [3085. 成为 K 特殊字符串需要删除的最少字符数](https://leetcode.cn/problems/minimum-deletions-to-make-string-k-special/)
   
   这道题目除了正难则反还有一个思想就是：固定最小次数向上依次遍历，最大次数和最小次数是不对等的，有一个转化/化归的技巧，但是这其实是由正难则反的来的。
   

#### 求逆

1. [174. 地下城游戏](https://leetcode.cn/problems/dungeon-game/)
   如果是从左上到右下考虑，关键是中间不能是非正数，考虑每条路上的“最负”的“最小”非常麻烦，但是从终点开始思考就会豁然开朗。
