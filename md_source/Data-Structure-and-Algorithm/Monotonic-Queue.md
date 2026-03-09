# 单调队列 Monotonic Queue

可以用deque维护滑动窗口中的最大值。

和单调栈非常像，储存下标，维持queue里元素的单调性。

作为优化工具，可以出现在DP、...问题中。

[239. 滑动窗口最大值](https://leetcode.cn/problems/sliding-window-maximum/)

**实现**：双端队列 

```c++
deque<int> q;
for (int i = 0; i < nums.size(); i++) {
    // 1. 入
    while (!q.empty() && nums[q.back()] <= nums[i]) {
        q.pop_back(); // 维护 q 的单调性
    }
    q.push_back(i); // 入队
    // 2. 出
    if (i - q.front() >= k) { // 队首已经离开窗口了
        q.pop_front();
    }
    // 3. 记录答案
    if (i >= k - 1) {
        // 由于队首到队尾单调递减，所以窗口最大值就是队首
        ans.push_back(nums[q.front()]);
    }
}
```

这样做的性能肯定优于用`multiset`维护一个有序数组。