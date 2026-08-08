# 图论

[toc]



## 建图

### STL容器直接建图

1. 对于节点、边这样的模型，直接用邻接表即可：
```c++
vector<int,vector<pair<int,int>>> g(n);
//对于每个节点，存下与之相邻的节点/边权值
```
还有一种建图方法
```c++
vector<vector<int>>g(n,vector<int>(n,INT_MAX/2));
//在Dijstra,Floyd里用的多，用上面那个也可以
```
2. 对于需要抽象建模的：
    首先确定**节点**是什么，问题DFS/BFS的对象是什么。然后思考如何建立节点与节点之间的联系。
    
    例如：LC721要求合并有共同邮箱的账户，节点就是各个账户，连接方式是判断有无共同邮箱。为了建立联系，用从邮箱到账户的哈希表。（目标是建立账户与账户之间的联系，已有账户到邮箱的联系，用哈希表建立从邮箱到账户的联系，结合两者就可以建立和账户到账户的联系）
    
    这种利用哈希表建立**反映射**的手法，不是第一次遇到了。
    
    事实上建图的本质就是让你快速从节点的编号得到相邻节点的编号（以及边的代价）。

### 数组低开销建图

开全局数组、在main函数外递归搜索，减小时间开销防止卡常。

```c++
const int N=3e5+10;
// nxt、to数组大小 N<<1 或 N*N*10
int head[N],nxt[N<<1],to[N<<1],cnt=1;
inline void add(int x,int y){
    ++cnt;nxt[cnt]=head[x];
    head[x]=cnt;to[cnt]=y;
}
// 遍历与节点x相连的节点
for(int i=head[x];i;i=nxt[i]){
    int y=to[i];
    // do something
}
```
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311550694.png)

静态连通性问题：DFS、BFS、并查集

## DFS

### DFS、贪心、连通块

   [2492. 两个城市间路径的最小分数](https://leetcode.cn/problems/minimum-score-of-a-path-between-two-cities/)因为可以重复走，找到连通块里的最短路即可。
   [924. 尽量减少恶意软件的传播](https://leetcode.cn/problems/minimize-malware-spread/)病毒感染只能在联通分量里，一个联通块有一个病毒全部会感染。

1. 遍历连通块并判断性质

   1.1 求连通块节点个数，边个数，最短边……（基本上都可以利用返回值递归实现）
   1.2 判断连通块是否为完全联通块：边数`v=e*(e-1)/2`，e是节点个数。



   

2. 遍历完图中所有的连通块，并要求后续查询方便（多次查询）

   [3108. 带权图里旅途的最小代价](https://leetcode.cn/problems/minimum-cost-walk-in-weighted-graph/)&肯定是越&越小的，允许重复运动那肯定是把连通块里所有的边都&上
```c++
vector<int> id(n,-1),cc_and;
function<int(int)>dfs=[&](int i){
    id[i]=cc_and.size();
    int and_=-1;
    for(auto [j,wt]:g[i]){
        and_&=wt;
        if(id[j]<0){
            and_&=dfs(j);
        }
    }
    return and_;
};
for(int i=0;i<n;i++){
    if(id[i]<0){
        cc_and.push_back(dfs(i));
    }
}
```

### DFS、判断有无环
[802. 找到最终的安全状态](https://leetcode.cn/problems/find-eventual-safe-states/)**三色染色法**

有点类似记忆化搜索，一个点的性质不会因为起点不同而改变。

- 白色（用 0 表示）：该节点尚未被访问；
- 灰色（用 1 表示）：该节点位于递归栈中，或者在某个环上；
- 黑色（用 2 表示）：该节点搜索完毕，是一个安全节点。

```c++
class Solution {
public:
    vector<int> eventualSafeNodes(vector<vector<int>>& graph) {
        //本质上是不能有环
        //拓扑排序
        //dfs+三色标记法
        int n=graph.size();
        vector<int> color(n);
        auto dfs=[&](auto&& self,int x)->bool{
            if(color[x]>0) return color[x]==2;
            color[x]=1;
            for(int y:graph[x]){
                if(!self(self,y)) return false;
            }
            color[x]=2;
            return true;
        };
        vector<int> ans;
        for(int i=0;i<n;i++){
            if(dfs(dfs,i)) ans.push_back(i);
        }
        return ans;
    }
};
```

### DFS、Trie

字典树上写DFS查找，自由度很强，主要考察写递归的能力。树形结构写DFS、BFS的好处是不需要用vis数组，对应地如果在图形结构上写DFS、BFS就一定要考虑是否重复访问。

[676. 实现一个魔法字典](https://leetcode.cn/problems/implement-magic-dictionary/)

```c++
struct Trie{
    bool isEnd=0;
    Trie* child[26]{};
};

class MagicDictionary {
private:
    Trie* root;
public:
    MagicDictionary() {
        root=new Trie();
    }
    
    void buildDict(vector<string> dictionary) {
        for(auto&& word:dictionary){
            Trie* cur=root;
            for(char ch:word){
                int idx=ch-'a';
                if(!cur->child[idx]){
                    cur->child[idx]=new Trie();
                }
                cur=cur->child[idx];
            }
            cur->isEnd=1;
        }
    }
    
    bool search(string searchWord) {
        auto dfs=[&](auto&& self,Trie* node,int pos,bool modified)->bool{
            if(pos==searchWord.size()){
                //字典树下标从1开始
                return modified&&node->isEnd;
            }
            int idx=searchWord[pos]-'a';
            if(node->child[idx]){
                if(self(self,node->child[idx],pos+1,modified)) return true;
            }
            if(!modified){
                for(int i=0;i<26;i++){
                    if(i!=idx&&node->child[i]){
                        if(self(self,node->child[i],pos+1,true)) return true;
                    }
                }
            }
            return false;
        };
        return dfs(dfs,root,0,false);
    }
};

/**
 * Your MagicDictionary object will be instantiated and called as such:
 * MagicDictionary* obj = new MagicDictionary();
 * obj->buildDict(dictionary);
 * bool param_2 = obj->search(searchWord);
 */
```

### 同一张图上多次DFS 

例如对不同的图边权的上限upper多次DFS，每次DFS都是需要一个vis数组的，为了避免重复初始化vis导致的时间浪费，可以将访问后的节点vis值设为upper，通过判断vis值是否为upper判断节点是否被访问过。注意每种情况只能DFS一次，如果有两次一定会错。

### DFS + 三色标记法 检测环
核心思路是：如果DFS过程中发现下一个节点在递归栈中，认为找到了环。
0： 没有访问过
1： 正在访问中，dfs尚未返回
2： 已经访问完毕，dfs已返回
```c++
auto dfs=[&](this auto&& dfs, int x)->bool{
    color[x]=1;
    for(int y:g[x]){
        if(color[y]==1 || color[y]==0&&dfs(y)){
            return true;
        }
    }
    color[x]=2;
    return false;
};
```

### DFS查找和值最大的连通区域
有一连通图，每个节点有一个权重，要找到一个连通子图使得子图内的节点权重之和最大。
```c++
long long ans=0,f[n]{};
auto dfs=[&](this auto&&dfs, int x, int fa)->void{
    f[x]=a[x];
    for(int y:g[x]) if(y!=fa){
        dfs(y,x)
        f[x]+=max(0ll,f[y]);
    }
    return;
};
dfs(0,-1);
for(int i=0;i<n;i++){
    ans=max(ans,f[i]);
}

```
这里的f[x]的含义并不是“包含该节点的最大结果”，而是在DFS遍历序下，不包含父节点分支的最大和。

为什么这样做是对的？分两种情况讨论：1. 如果最大的结果包括0节点，答案就是f[0]，根据递归写法这是对的。2. 如果最大的结果不包括0节点，答案就是某个$f[i] (i!=0)$，由于在DFS上0在该节点的父节点方向上，所以也是对的。
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311550890.png)

## BFS

### BFS模板
```c++
queue<int> q;
q.push(start);

vector<bool> vis(n);
vis[start]=true;

while(level--){ //or while(!q.empty())
	int span=q.size();
	for(int i=0;i<span;i++){
		int u=q.front();
		q.pop();
		
		for(int son:g[u]) if(!vis[son]){
			//一定要对儿子标记，不能只标记父亲
			q.push(son);
			vis[son]=true;
		}
	}
}
```
为什么遍历的时候一定要对儿子标记：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311501650.png)

其实是涉及到起点到某一个节点有多条路径的情况，如上述节点2，深度既可以是1也可以是2，标记儿子可以保证访问到节点时，一定是**最短路径**。和`Dijstra`算法有一些相似，对于一些边长全部为1的图，可以直接用BFS而不是`Dijstra`计算最短路。




### BFS、拓扑排序

3. 用g邻接表记录出边，`indeg`数组记录每个节点的入度。
```cpp
//预处理
for(const auto&edge:edges){
	g[edge[0]].push_back(edge[1]);
	++indeg[edge[1]]; //效率高些
}
//BFS求拓扑排序
queue<int> q;
for(int i=0;i<n;++i){
	if(!indeg[i]){
		q.push(i);
	}
}
while(!q.empty()){
	int u=q.front();
	q.pop();
	for(int v:g[u]){
		//处理逻辑
		
		//拓扑排序
		--indeg[v];
		if(!indeg[v]){
			q.push(v);
		}
	}
}
```

### 拓扑排序进阶
经典拓扑排序比较简单，可以参照上面的BFS的写法。

**删除一条边拓扑排序** 
只影响节点的入度，不必枚举边，而是枚举节点。

**双层拓扑排序**
n个项目由m个组完成，项目间有完成的先后顺序，并且要求同一组的项目要相邻。其核心是对组间关系建模，先对组间拓扑排序，后对组内项目进行拓扑排序。

```c++
vector<vector<int>> groupItems(m);

vector<vector<int>> groupGraph(m),itemsGraph(n);
vector<int> groupDeg(m),itemsDeg(n);

for(int i=0;i<n;i++){
    groupItems[group[i]].push_back(i);
}

// 建图
for(int i=0;i<n;i++){
    for(int j:prev[i]){
        // 遍历所有的连接关系
        int nowgroupID=group[i];
        int pregroupID=group[j];
        if(nowgroupID==pregroupID){
            // 在一个组里
            itemsGraph[j].push_back(i);
            ++itemsDeg[i]++;
        }else{
            // 不在一个组里
            groupGraph[pregroupID].push_back(nowgroupID);
            ++groupDeg[nowgroupID];
        }
    }
}

// 得到最终排序
vector<int> grouptupsort=TopSort(groupDeg,groupGraph,id);
vector<int> ans;
for(int groupID:grouptopsort){
    if(groupItems[groupID].empty()) continue;
    vector<int> res=TopSort(itemsDeg,itemsGraph,groupItems[groupID]);
    for(int r:res){
        ans.push_back(r);
    }
}
```

### BFS、判断有无环
[802. 找到最终的安全状态](https://leetcode.cn/problems/find-eventual-safe-states/)建立反图+拓扑排序，安全的节点由下往上传递。

```c++
class Solution {
public:
    vector<int> eventualSafeNodes(vector<vector<int>>& graph) {
        //本质上是不能有环
        //拓扑排序
        //dfs+三色标记法
        int n=graph.size();
        vector<vector<int>> rev(n);
        vector<int> indeg(n);
        for(int i=0;i<n;i++){
            for(int j:graph[i]){
                rev[j].push_back(i);
            }
            indeg[i]=graph[i].size();
        } 
        queue<int> q;
        for(int i=0;i<n;i++){
            if(indeg[i]==0) q.push(i);
        }
        while(!q.empty()){
            int y=q.front();
            q.pop();
            for(int nxt:rev[y]){
                if(--indeg[nxt]==0){
                    q.push(nxt);
                }
            }
        }
        vector<int> ans;
        for(int i=0;i<n;i++){
            if(indeg[i]==0) ans.push_back(i);
        }
        return ans;
    }
};
```

BFS是拓扑排序的实现基础，后续基环树、找环都是以拓扑排序为基础。

## 最短路算法
最短路径的算法有很多，包括 Dijkstra，Floyd，Bellman-Ford，SPFA 等

### 最短路基础

**BFS**

如果看到**最小**、**最短**，就要往BFS靠，DFS做会出问题。

BFS最重要的就是在push进队列时，就要把vis数组给更新。

节点被push进队列前，访问信息就要被更新。在队列里的节点，访问信息已经被更新了。在BFS里就是已经访问过了，不会再访问。

如果用了dist数组，就不需要span来区分当前层和下一层。dist数组如果更新了，表示该节点已经访问过了，不要再入队列了。

BFS和Dijkstra不同的地方是，每个节点只会入队一次，且更新节点时不需要额外判断之前是否更新过，这两者其实是一体的，体现的是BFS问题简单图论结构对解法的宽容。


**1BFS**
当图中的边权只有1时，要求寻找最短路。

BFS用于解决最短路的问题，和Dijkstra相似。
各个节点第一次到达时，一定是最短的路径。

dist数组写法：
```c++
auto bfs=[&](){
    int dist[n];
    memset(dist,-1,sizeof(dist));
    dist[0]=0;
    queue<int> q;
    q.push(0);
    while(!q.empty()){
        int sn=q.front();q.pop();
        for(int fn:g[sn]) if(dist[fn]==-1){
            q.push(fn);
            dist[fn]=dist[sn]+1;
        }
    }
    return dist[n-1];
};
```



点到点写法（节省空间）
```c++
auto bfs = [&](int i) -> int {
    vector<int> q = {0};
    for (int step = 1; ; step++) {
        vector<int> nxt;
        for (int x : q) {
            for (int y : g[x]) {
                if (y == n - 1) {
                    return step;
                }
                if (vis[y] != i) {
                    vis[y] = i;
                    nxt.push_back(y);
                }
            }
        }
        q = move(nxt);
    }
};
```

**交错BFS**
如果路线要求必须使红蓝交错呢？
**错误**写法：用两个队列分别维护，可能会导致有点遍历不到。

```c++
vector<int> ans(n,-1);
ans[0]=0;
queue<int> red,blue;
red.push(0);blue.push(0);
while(!red.empty()||!blue.empty()){
    int redspan=red.size(),bluespan=blue.size();
    while(redspan--){
        int x=red.front();red.pop();
        for(int y:g[1][x]) if(ans[y]==-1){
            ans[y]=ans[x]+1;
            blue.push(y);
        }
    }
    while(bluespan--){
        int x=blue.front();blue.pop();
        for(int y:g[0][x]) if(ans[y]==-1){
            ans[y]=ans[x]+1;
            red.push(y);
        }
    }
}
```
**正确**写法：每个节点视为两个，一同BFS。

```c++
vector<vector<int>> dist(2,vector<int>(n,INT_MAX));
dist[0][0]=dist[1][0]=0;
queue<pair<int,int>> q;
q.push({0,0});
q.push({1,0});
while(!q.empty()){
    //这里不能用&，否则出现指针空悬错误。
    auto [t,x]=q.front();
    q.pop();
    for(int y:g[1-t][x]){
        if(dist[1-t][y]==INT_MAX){
            dist[1-t][y]=dist[t][x]+1;
            q.push({1-t,y});
        }
    }
}
```

**01BFS**
边权只有0、1，用双端队列，手动维护Dijkstra最小堆。核心思想是：如果边权为0，直接插入当前队列中（前面），如果边权是1，插入到后续的队列中，下一次再遍历。感觉像一半的DFS和一半的BFS。数据结构使用双端队列deque。

判断dist是否更新不能用来判断节点是否被访问过（和普通BFS不一样的地方），可能没有遍历到但是dist已经更新了（考虑情况：两个节点可以通过更远的0路连接到一起，但也和一条1路相连）。

dist数组写法（不能体现01BFS优势，直接BFS就是这样写的，运行速度快不了多少（72ms、92ms））
```c++
while(!q.empty()){
	auto [x,y]=q.front();
	q.pop_front();
	for(int k=1;k<=4;k++){
    	int nx=x+dir[k][0],ny=y+dir[k][1];
    	if(nx<0||nx>=n||ny<0||ny>=m) continue;
    	if(grid[x][y]==k) {
        	if(dist[nx][ny]>dist[x][y]){
            	dist[nx][ny]=dist[x][y];
            	q.push_front({nx,ny});
        	}
    	}else{
        	if(dist[nx][ny]>dist[x][y]+1){
            	dist[nx][ny]=dist[x][y]+1;
            	q.push_back({nx,ny});
        	}
    	}
    }
}
```

vis数组（vis数组更新的位置在上面，从队列里出来的时候，结果已经板上钉钉的时候）+传入结果。（运行更快，减少了需要判断的情况）
```c++
while (!pq.empty()) {
    pii f = pq.front();
    pq.pop_front();
    int y = f.second / m, x = f.second % m;
    if (vis[y][x]) continue;
    vis[y][x] = true;
    if (y == n - 1 && x == m - 1)
        return f.first;
    for (int k = 1; k <= 4; ++k) {
        int nx = x + dx[k], ny = y + dy[k];
        if (nx < 0 || nx >= m || ny < 0 || ny >= n)
            continue;
        if (grid[y][x] == k) 
            pq.push_front(make_pair(f.first, ny * m + nx));
        else
            pq.push_back(make_pair(f.first + 1, ny * m + nx));
    }
}
```
**BFS图中最小环**
判断是否为环，其实有点难。一般要用dfs，但是考虑两个环相并的情况，可能出现问题。这道题并没有严格判环，但因为最小值，可以用最小路的想法求出最小环。

考虑一个基环树的结构，在环外可以计算出一个“最小环长”，在环内也可以计算出一个结果，且后者一定小于前者，后者是合法的，前者是非法的，取最小值所以可以得到正确答案。

树结构不能检测到环，返回INT_MAX。环结构就是正常的。

这是一个比较经典的解法。
[2608. 图中的最短环](https://leetcode.cn/problems/shortest-cycle-in-a-graph/)
```c++
class Solution {
public:
    int findShortestCycle(int n, vector<vector<int>> &edges) {
        vector<vector<int>> g(n);
        for (auto &e: edges) {
            int x = e[0], y = e[1];
            g[x].push_back(y);
            g[y].push_back(x); // 建图
        }

        int dis[n]; // dis[i] 表示从 start 到 i 的最短路长度
        auto bfs = [&](int start) -> int {
            int ans = INT_MAX;
            memset(dis, -1, sizeof(dis));
            dis[start] = 0;
            queue<pair<int, int>> q;
            q.emplace(start, -1);
            while (!q.empty()) {
                auto [x, fa] = q.front();
                q.pop();
                for (int y: g[x])
                    if (dis[y] < 0) { // 第一次遇到
                        dis[y] = dis[x] + 1;
                        q.emplace(y, x);
                    } else if (y != fa) // 第二次遇到
                        ans = min(ans, dis[x] + dis[y] + 1);
            }
            return ans;
        };
        int ans = INT_MAX;
        for (int i = 0; i < n; ++i) // 枚举每个起点跑 BFS
            ans = min(ans, bfs(i));
        return ans < INT_MAX ? ans : -1;
    }
};
```


### 单源最短路Dijkstra

**堆**优化写法：

dist数组+堆

```python
dis=[inf]*n
dis[0]=0
h=[(0,0)] #堆
while h:
	dx,x=heappop(h)
	if dx>dis[x]:continue
	for y,d in g[x]:
		new_dis=d+dx
		if new_dis<dis[y]:
			dis[y]=new_dis
			heappush(h,(new_dis,y))
```
```c++
vector<int> dis(n, INT_MAX);
dis[k - 1] = 0;
priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
pq.emplace(0, k - 1);
while (!pq.empty()) {
    auto [dx, x] = pq.top();
    pq.pop();
    if (dx > dis[x]) { // x 之前出堆过
        continue;
    }
    for (auto &[y, d] : g[x]) {
        int new_dis = dx + d;
        if (new_dis < dis[y]) {
            dis[y] = new_dis; // 更新 x 的邻居的最短路
            pq.emplace(new_dis, y);
        }
    }
}
```

稠密图写法：

dist数组+vis数组
```c++
int n = g.size();
vector<int> dis(n, INT_MAX / 2), vis(n);
dis[start] = 0;
while (true) {
    int x = -1;
    for (int i = 0; i < n; i++) {
        if (!vis[i] && (x < 0 || dis[i] < dis[x])) {
            x = i;
        }
    }
    if (x < 0 || dis[x] == INT_MAX / 2) { // 所有从 start 能到达的点都被更新了
        return -1;
    }
    if (x == end) { // 找到终点，提前退出
        return dis[x];
    }
    vis[x] = true; // 标记，在后续的循环中无需反复更新 x 到其余点的最短路长度
    for (int y = 0; y < n; y++) {
        dis[y] = min(dis[y], dis[x] + g[x][y]); // 更新最短路长度
    }
}

```

朴素写法（适用于稠密图）
```c++
vector<int> dist(n,INT_MAX/2),done(n);
dist[start]=0;
while(true){
    int x=-1;
    for(int i=0;i<n;i++){
        if(!done[i] && (x<0 || dist[i]<dist[x])){
            x=i;
        }
    }

    if(x<0) break; //结束
    if(dist[x]==INT_MAX/2) break; //结束 有节点无法到达

    done[x]=1;
    for(int y=0;y<n;y++){
        dist[y]=min(dist[y],dist[x]+g[x][y]);
    }
}
```
堆优化写法（适用于稀疏图）
```c++
vector<int> dist(n,INT_MAX/2);
dist[start]=0;
priority_queue<pair<int,int>,vector<pair<int,int>>,greater<pair<int,int>>> q;
q.push({0,start});
while(!q.empty()){
    auto [dx,x]=q.top();
    q.pop();
    if(dx>dist[x]) {
        // 已经遍历过
        continue;
    }
    for(auto& [y,d]:g[x]){
        int new_dist=dx+d;
        if(new_dist<dist[y]){
            dist[y]=new_dist;
            q.push({new_dist,y});
        }
    }
}
```
Dijkstra求次短路
[2045](https://leetcode.cn/problems/second-minimum-time-to-reach-destination/description/)在一个复杂图中求次短路长度。
```c++
class Solution {
public:
    int secondMinimum(int n, vector<vector<int>>& edges, int time, int change) {
        vector<vector<int>> g(n);
        for(int i=0;i<edges.size();i++){
            int u=edges[i][0]-1,v=edges[i][1]-1;
            g[u].push_back(v);
            g[v].push_back(u);
        }
        auto next=[&](int now)->int{
            int cishu=now/change;
            int res=now+time;
            if(cishu%2){
                res+=change-(now%change);
            }
            return res;
        };
        vector<vector<int>> dist(n,vector<int>(2,INT_MAX));
        dist[0][0]=0;
        priority_queue<pair<int,int>,vector<pair<int,int>>,greater<pair<int,int>>> pq;
        pq.emplace(0,0);
        while(!pq.empty()){
            auto [dx,x]=pq.top();pq.pop();
            if(dx>dist[x][1]) continue;
            if(x==n-1&&dist[x][1]!=INT_MAX) return dist[x][1];
            for(int y:g[x]){
                int new_dist=next(dx);
                if(new_dist<dist[y][0]){
                    dist[y][0]=new_dist;
                    pq.emplace(new_dist,y);
                }else if(new_dist<dist[y][1]&&new_dist>dist[y][0]){
                    dist[y][1]=new_dist;
                    pq.emplace(new_dist,y);
                }
            }
        }
        return dist[n-1][1];
    }
};
```
两个问题：
1. 为什么图权重“变化”情况下还可以使用Dijkstra
2. 为什么这样可以求次短路

### 多源最短路Floyd


## 基环树
n个节点 + n条边 就是一个基环树。对于基环树问题（找环，求环长），可以利用**拓扑排序去掉树枝**再进行处理。

### 从树到基环树

在一个n个节点，n-1条边的图（连通则就是树，否则可能是是一个树加若干环/基环树）中，添加一条边有一下几种情况（不一定就是基环树，有一些其他情况）：
例题：[684](https://leetcode.cn/problems/redundant-connection/description/)、[685](https://leetcode.cn/problems/redundant-connection-ii/description/) 冗余连接，分别找到无向图和有向图中多加的那个边
**无向图** 一个环+许多旁枝（连通） 或者 多个环没有旁枝（不连通）
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311551323.png)

**有向图** 可以视为一个有根树连上一条边，可以分为两种情况：**新的边终点连到根**的边，这就是环+边枝；新的边终点不是根，这个时候没有环，特殊点是入度为2的节点。
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311551324.png)
此时如果要用基环树解决需要反向建图，因为树结构是只有一个父亲，反向建图后树结构变成了只有一个儿子，这样就可以用拓扑排序去掉树枝了。题解示例：[658题解](https://leetcode.cn/problems/redundant-connection-ii/solutions/2943769/bao-xiao-zhao-die-liu-ji-huan-jian-zhi-b-f7zl/)。

### 内向基环树
每个节点只有一个出度，一个n节点n条边的有向图。由一个基环和和指向基环的树枝构成。对于内向基环树，求节点到节点的距离时，不需要BFS或Dijkstra，只需要沿着路前进即可。

[2360](https://leetcode.cn/problems/longest-cycle-in-a-graph/description/)图中的最长环，先利用拓扑排序去掉树枝，遍历剩下的环求长度即可。由于内向基环树每个节点只有一个出度，可以直接沿着路前进，用一个循环求出环长度。
```c++
class Solution {
public:
    int longestCycle(vector<int>& edges) {
        int n=edges.size();
        vector<int> now,in(n),vis(n);
        for(int i=0;i<n;i++){
            if(edges[i]!=-1){
                in[edges[i]]++;
            }
        }
        for(int i=0;i<n;i++){
            if(in[i]==0) {
                now.push_back(i);
                vis[i]=1;
            }
        }
        while(!now.empty()){
            vector<int> nxt;
            for(int i:now){
                if(edges[i]!=-1){
                    if(--in[edges[i]]==0){
                        vis[edges[i]]=1;
                        nxt.push_back(edges[i]);
                    }
                }
            }
            now=move(nxt);
        }
        // 可能有多个环
        int ans=-1;
        auto huan=[&](int x)->int{
            int l=0;
            while(vis[x]==0){
                vis[x]=1;
                x=edges[x];
                l++;
            }
            return l;
        };
        for(int i=0;i<n;i++){
            if(vis[i]==0){
                ans=max(ans,huan(i));
            }
        }
        return ans;
    }
};
```

[2359](https://leetcode.cn/problems/find-closest-node-to-given-two-nodes/description/) 内向基环树中，求两个节点到公共节点距离最大值的最小值。思路是求出两个dist数组，分别表示两个节点到其他节点的距离。然后遍历所有节点，求出两个dist数组中对应节点距离的最大值，取最小值即可。由于内向基环树每个节点只有一个出度，可以直接沿着路前进，用一个循环求出距离。
```c++
class Solution {
public:
    int closestMeetingNode(vector<int> &edges, int node1, int node2) {
        int n = edges.size(), min_dis = n, ans = -1;
        auto calc_dis = [&](int x) -> vector<int> {
            vector<int> dis(n, n);
            for (int d = 0; x >= 0 && dis[x] == n; x = edges[x])
                dis[x] = d++;
            return dis;
        };
        auto d1 = calc_dis(node1), d2 = calc_dis(node2);
        for (int i = 0; i < n; ++i) {
            int d = max(d1[i], d2[i]);
            if (d < min_dis) {
                min_dis = d;
                ans = i;
            }
        }
        return ans;
    }
};
```

[2127](https://leetcode.cn/problems/maximum-employees-to-be-invited-to-a-meeting/description/)内向基环树，选出最多的节点使得他们排成一个圈，每个节点至少指向一个相邻的节点。分为两种情况：基环长度大于2时，答案就是基环的长度；基环只有两个节点的特殊情况。所有的特殊情况可以拼接起来。
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601311550762.png)
```c++
class Solution {
public:
    int maximumInvitations(vector<int>& favorite) {
        int n=favorite.size();
        vector<int> deg(n);
        for(int f:favorite){
            deg[f]++;
        }

        vector<vector<int>> rg(n);
        vector<int> now;
        for(int i=0;i<n;i++){
            if(deg[i]==0){
                now.push_back(i);
            }
        }
        while(!now.empty()){
            vector<int> nxt;
            for(int x:now){
                int y=favorite[x];
                rg[y].push_back(x);
                if(--deg[y]==0){
                    nxt.push_back(y);
                }
            }
            now=move(nxt);
        }

        auto rdfs=[&](this auto&& rdfs, int x)->int{
            int mx_dep=1;
            for(int y:rg[x]){
                mx_dep=max(mx_dep,rdfs(y)+1);
            }
            return mx_dep;
        };

        int case1=0,case2=0;
        for(int i=0;i<n;i++){
            if(deg[i]==0) continue;

            int ringsize=1;
            deg[i]=0;
            for(int x=favorite[i];x!=i;x=favorite[x]){
                deg[x]=0;
                ringsize++;
            }

            if(ringsize==2){
                case2 += rdfs(i)+rdfs(favorite[i]);
            }else{
                case1=max(case1,ringsize);
            }
        }
        return max(case1,case2);
    }
};
```
这个题有几点可以借鉴的：
1. 拓扑排序同时反向建图，最后建的就是以环上一个点为根的树。
2. 避免重复访问一个环上的点，注意判断的条件。




## 二分图与网络流

**二分图定义** 

## 技巧

### 反向建图

1. “安全节点”，随着出边前进不会进入到循环圈里的节点。要寻找到所有安全节点。利用反向建图+拓扑排序就可以完成。

2. 要求所有的点都能到达某一节点，如果是用DFS检查每一个点时间复杂度为$O(n^2)$。可以反向建图，在该结点处一次DFS判断是否遍历到所有的点，时间复杂度是$O(n)$。

### 图结构的“腐蚀”

当问题有如下特征时：
1. 某条路会在某个时间段后消失
2. 在满足某条件下，尽量消去权值较大的边

这些时候不需要对图的结构做变化，而是维护一个新变量用于判断节点间是否连通。



## 图论例题

[牛客2025寒假训练营4-J](https://ac.nowcoder.com/acm/contest/95336/J)无向图，有k次侵蚀机会，一个点被侵蚀后可以侵蚀相邻的节点，求最大侵蚀节点数侵蚀方案，有多种方案输出字典序最小的顺序。

思路：先求出所有的连通块，如果块数大于k，就选前k大的块。否则可以全部侵蚀，多余的侵蚀机会可以用于提升字典序。

使用并查集。使用优先队列。


