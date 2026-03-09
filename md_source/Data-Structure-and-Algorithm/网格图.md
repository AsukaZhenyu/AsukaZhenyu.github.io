# 网格图

对于网格图、一般图需要处理**重复访问**的问题（和DFS/BFS无关）
## DFS
方法：递归、栈

问题：前中后序（二叉树）、连通块（网格图、一般图）、判环（一般图）

1. 计算有多少个区域（种子填充算法）
计数在外面，不在递归函数里计数
```python
cnt=0
dirs=[[0,1],[0,-1],[1,0],[-1,0]]
m,n=len(grid),len(grid[0])
def seed_fill(i:int,j:int)->None:
    if grid[i][j]=='0':return
    grid[i][j]='0'
    for dx,dy in dirs:
        x,y=i+dx,j+dy
        if x>=0 and x<m and y>=0 and y<n and grid[x][y]=='1':
            seed_fill(x,y)
for i in range(m):
    for j in range(n):
        if grid[i][j]=='1':
            cnt+=1
            seed_fill(i,j)
```

2. 计算联通区域面积
当然可以外置一个`cnt`变量，每次计算是手动重置，也可以直接返回面积值。python可以使用连不等式。
```python
def dfs(x: int, y: int) -> int:
    land[x][y] = 1  # 标记 (x,y) 被访问，避免重复访问
    cnt0 = 1
    # 访问八方向的 0
    for i in range(x - 1, x + 2):
        for j in range(y - 1, y + 2):
            if 0 <= i < m and 0 <= j < n and land[i][j] == 0:
                cnt0 += dfs(i, j)
    return cnt0
```
3. 计算联通区域的周长
在计算答案的时候计算每个格点对答案的贡献，每增加一个邻居，贡献减一。
```python
def length_cal(i:int,j:int)->int:
    if grid[i][j]==0:return 0
    ans=0
    grid[i][j]=2
    cnt_now=4
    for dx,dy in dirs:
        x,y=i+dx,j+dy
        if 0<=x<m and 0<=y<n and grid[x][y]:
            cnt_now-=1
            if grid[x][y]==1:
                ans+=length_cal(x,y)
    return ans+cnt_now
```

## BFS
方法：队列
问题：层序（树）、最短路（图）

## 非物理相邻
虽然是网格图，但是另外定义了相邻方式，本质上是图论问题。
例如：每次行动只能到同行/同列数值更大的格点处，求行动最多次数。其本质是在有向无环图上求最长路径（拓扑排序动态规划）。
思路：从最小的元素（拓扑排序起点）开始递推，（正确性）因为不可能从更大的值转移过来。

```python
g=defaultdict(list)
for i,row in enumerate(mat):
    for j,x in enumerate(row):
        g[x].append((i,j))
row_max=[0]*len(mat)
col_max=[0]*len(mat[0])
for _,pos in sorted(g.items(),key=lambda p:p[0]):
    mx=[max(row_max[i],col_max[j])+1 for i,j in pos]
    for (i,j),f in zip(pos,mx):
        row_max[i]=max(row_max[i],f)
        col_max[j]=max(col_max[j],f)
ans=max(row_max)
```

灵活利用网格图访问元素便利的特点，不要特地去建图（把节点的连接方式直接存下来）。