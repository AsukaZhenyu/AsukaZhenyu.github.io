## 化归

1. 有时的转化不一定是正确的，

   [2321. 拼接数组的最大分数](https://leetcode.cn/problems/maximum-score-of-spliced-array/)
```c++
class Solution {
public:
    int maximumsSplicedArray(vector<int>& nums1, vector<int>& nums2) {
        int n=nums1.size();
        int n1=accumulate(nums1.begin(),nums1.end(),0),n2=accumulate(nums2.begin(),nums2.end(),0);
        if(n1<n2){
            int mid=n1;
            n1=n2;
            n2=mid;
            nums1.swap(nums2);
        }
        //把nums1变大
        for(int i=0;i<n;i++){
            nums2[i]-=nums1[i];
        }//在nums2里找 最大子数组和
        int fmax=0,f=0;
        for(int i=0;i<n;i++){
            f=max(0,f)+nums2[i];
            fmax=max(f,fmax);
        }
        return n1+fmax;
    }
};
```
这里做了一步转换，那就是让大的变得更大，但是这是不一定成立的，因为nums1-nums2和nums2-nums1进行DP计算最长子数组的结果可能完全不一样，所以这样做是错的