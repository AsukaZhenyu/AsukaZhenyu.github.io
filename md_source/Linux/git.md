# git

[toc]

## 工作区与暂存区、本地仓库与远程仓库

**工作区（Working Directory）**：正在编辑的本地文件。

**暂存区（Staging Area/Index）**：临时存放待提交改动的区域。
```git bash
git add .
```
这条命令就是将“在工作区修改的文件”加入到暂存区，准备提交。

**本地仓库（Local Repository）**：Git记录的所有版本数据。
```git bash
git commit -m "messages"
```
把暂存区的文件改动提交到本地仓库。

**远程仓库（Remote Repository）**：托管在Github服务器上的版本库
```git bash
git push origin main
```
将你本地仓库的 main 分支上的提交，推送到名为 origin 的远程仓库中对应的 main 分支上。

## git branchs

内容来自[Learn Git Branching](https://learngitbranching.js.org/)。

git下项目版本管理，实际上是以不同提交（commit）为节点的树。分支（branch）是一个指针，指向一个节点和这个节点的所有父节点。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603090936534.png)

**提交（commit）**：记录项目跟踪文件的快照（snapshot），提交非常轻量，在可能的情况下会压缩为一组更改。

**分支（branch）**：指向提交（commit）的指针，包含此节点和所有父节点的所有工作。
```
git checkout -b newBranch
```
创建并跳转到新的分支

**融合（Merge）**：将两个分支的工作融合在一起。创建一个新提交，有两个父节点，包含两个父节点以及父节点所有父节点的工作。
```
git merge bugFix
```
把bugFix分支的工作融合到当前分支下。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603090953760.png)

**融合的要求**：两个分支必须有共同父节点（包括一个节点是另一个节点祖先的情况），在执行融合前工作区与暂存区不能有未提交的修改。

**融合的分类**：
“三方合并（Three-way merge）”：基于共同祖先、当前分支最新提交、合并分支最新提交三者进行合并。
“快进合并（Fast-forward ）”：若当前分支是合并分支的祖先，这是只会移动当前分支的指针，不会创建新节点。

**变基（rebase）**：将当前分支上的所有本地提交“复制”到目标分支的最新提交之后，重新应用这些修改。它会改变提交的顺序和哈希值，使历史变成一条直线，就像这些修改是在目标分支最新提交之后才发生的一样。
```
git rebase main
```
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603091004046.png)

**HEAD**
- HEAD 是一个引用（reference），存储在 .git/HEAD 文件中。
- 通常情况下，它指向一个本地分支（如 refs/heads/main），而该分支再指向某个具体的提交。
- 也可以直接指向一个具体的提交 ID，这种状态称为 “分离头指针（detached HEAD）”。

HEAD指向当前工作区对应的提交/分支（通过`git status`或者`git log`查看），当你进行提交时，HEAD也会随之更新。

**分支树上自由移动**
通过`git checkout`+分支名、HEAD、相对引用、提交节点ID（哈希值），可以在分枝树上自由移动。checkout命令可以改变HEAD的指向，在其他用法里还可以恢复文件、创建分支。

**相对引用（Relative Refs）**
- HEAD~ 或 HEAD~1：当前提交的父提交
- HEAD~2：当前提交的祖父提交
- HEAD^：也是父提交（与 ~ 在普通提交上等价，但在合并提交中 ^ 可指定第几个父提交）
相对引用的锚点可以是HEAD，也可以是分支，还可以是提交的哈希值。
