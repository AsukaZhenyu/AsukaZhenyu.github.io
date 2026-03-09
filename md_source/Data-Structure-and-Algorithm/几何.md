# 几何

最近刷题的时候遇到了几何相关的题目。感到有些无从下手

[963. 最小面积矩形 II](https://leetcode.cn/problems/minimum-area-rectangle-ii/)
枚举三个点，第四个点用哈希表查找。
先用弱条件去掉一部分（是否是平行四边形），然后再判断（是否是矩形）

```c++
class Solution {
public:
    double minAreaFreeRect(vector<vector<int>>& points) {
        set<pair<int,int>> st;
        for(auto &e:points){
            st.insert(make_pair(e[0],e[1]));
        }
        int n=points.size();
        double ans=DBL_MAX;
        for(int i=0;i<n-2;i++){//p1
            for(int j=i+1;j<n-1;j++){//p2
                for(int k=j+1;k<n;k++){//p3
                    auto p4=make_pair(points[j][0]+points[k][0]-points[i][0],points[j][1]+points[k][1]-points[i][1]);
                    if(st.contains(p4)){
                        int x1=points[j][0]-points[i][0],x2=points[k][0]-points[i][0];
                        int y1=points[j][1]-points[i][1],y2=points[k][1]-points[i][1];
                        if(x1*x2+y1*y2==0){
                            double l1=sqrt((double)x1*x1+y1*y1);
                            double l2=sqrt((double)x2*x2+y2*y2);
                            ans=min(ans,l1*l2);
                        }
                    }
                }
            }
        }
        return ans==DBL_MAX?0:ans;
    }
};
```



还有一道是学校OJ的题：
给三根水平线，计算出正三角形的x坐标。这道题用到了旋转和全等去构造，感觉根本想不到。