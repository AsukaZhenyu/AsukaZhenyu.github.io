# 并查集

## 实现
并查集的核心只有fa数组，合并两个集合的时候找到头再合并就不会错，首次查询的时候再压缩路径。

```c++
//初始化
vector<int> fa(n);
iota(fa.begin(),fa.end(),0); //fa[i]=i

//查询+路径压缩
int find(int x){
	return fa[x]==x?x:fa[x]=find(fa[x]);
}

//合并
pa[find(x)]=find[y];
//注意不要用fa[x]表示代表点，一定要用find(x)，此时不一定完成了路径压缩

//删除
//对于叶子节点
fa[x]=x;
```

## 问题
如果要计算每个集合的某个值，可以定义与`fa`数组类似的数组，`f[i]`表示代表点i的集合的数值。`f`的操作和`fa`的操作同步。

[3108. 带权图里旅途的最小代价](https://leetcode.cn/problems/minimum-cost-walk-in-weighted-graph/)

```c++
class Solution {
public:
    vector<int> minimumCost(int n, vector<vector<int>>& edges, vector<vector<int>>& query) {
        vector<int> fa(n),and_(n,-1);
        function<int(int)> find=[&](int x){
            return fa[x]==x?x:fa[x]=find(fa[x]);
        };
        iota(fa.begin(),fa.end(),0);
        for(auto e:edges){
            int x=find(e[0]);
            int y=find(e[1]);
            and_[y]&=e[2];
            if(x!=y){
                fa[x]=y;
                and_[y]&=and_[x];
            }
        }
        vector<int> ans;
        ans.reserve(query.size());
        for(auto q:query){
            int s=q[0],t=q[1];
            ans.push_back(find(s)==find(t)?and_[find(s)]:-1);
        }
        return ans;
    }
};
```


[1971. 寻找图中是否存在路径](https://leetcode.cn/problems/find-if-path-exists-in-graph/)

模板
```c++
class UnionFind {
public:
    UnionFind(int n) {
        parent = vector<int>(n);
        rank = vector<int>(n);
        for (int i = 0; i < n; i++) {
            parent[i] = i;
        }
    }

    void uni(int x, int y) {
        int rootx = find(x);
        int rooty = find(y);
        if (rootx != rooty) {
            if (rank[rootx] > rank[rooty]) {
                parent[rooty] = rootx;
            } else if (rank[rootx] < rank[rooty]) {
                parent[rootx] = rooty;
            } else {
                parent[rooty] = rootx;
                rank[rootx]++;
            }
        }
    }

    int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }

    bool connect(int x, int y) {
        return find(x) == find(y);
    }
private:
    vector<int> parent;
    vector<int> rank;
};

class Solution {
public:
    bool validPath(int n, vector<vector<int>>& edges, int source, int destination) {
        if (source == destination) {
            return true;
        }
        UnionFind uf(n);
        for (auto edge : edges) {
            uf.uni(edge[0], edge[1]);
        }
        return uf.connect(source, destination);
    }
};
```