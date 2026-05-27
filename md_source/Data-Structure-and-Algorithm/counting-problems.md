## 计数问题

计数问题优化复杂度的一个方法是贡献法。

> 贡献法是一种计数的思想方法
> 基本思想是计算每个元素对答案的贡献度


举个例子：
1. 路径由一段一段的长为一的小段组成，现在要求所有被走过的路径的长度。可以转化为求每一小段路被经过了多少次。
2. 如果要求所有满足条件的区间里，有多少个质数，可以转换为，所有质数出现的个数。

### xor

$\sum_{i=l}^{r}\sum_{j=l}^{r}a_i \oplus a_j$
可以优化到$O(nlog(N))$，其中$N$为$a_i$的最大值

问题可以推广到$a_i$和$b_j$的异或和，两个数组可以不同，数组的长度也可以不同。

```c++
class Solution{
    public:
    // Returns sum of bitwise OR
    // of all pairs
    long long int sumXOR(int arr[], int n)
    {
    	//Complete the function
    	int cnt[32]{};
    	for(int i=0;i<n;i++){
    	    int mid=arr[i];
    	    int pos=0;
    	    while(mid){
    	        if(mid%2) cnt[pos]++;
    	        pos++;
    	        mid/=2;
    	    }
    	}
    	long long ans=0;
    	for(int i=0;i<n;i++){
    	    int mid=arr[i];
    	    for(int pos=0;pos<32;pos++){
    	        if((mid>>pos)&1){
    	            ans+=(1ll<<pos)*(n-cnt[pos]);
    	        }else{
    	            ans+=(1ll<<pos)*cnt[pos];
    	        }
    	    }
    	}
    	return ans/2;
    }
};

```

查询区间$[l,r]$的$\sum_{i=l}^{r}\sum_{j=i}^{r}a_i \oplus b_j$，因为b的计算区间一直在变，在计算过程中需要b任意区间的位数的统计。如果只有一个端点变化，则可以用前缀和维护，考虑对问题进行变换。

$$
\sum_{i=l}^{r}\sum_{j=i}^{r}a_i \oplus b_j=
\sum_{i=l}^{r}\sum_{j=i}^{n}a_i \oplus b_j-\sum_{i=l}^{r}\sum_{j=r+1}^{n}a_i \oplus b_j
$$

利用n将b的计算区间变为一端固定的，可以用前缀和来维护。
