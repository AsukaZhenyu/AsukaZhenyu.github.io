# C++并发编程基础

[toc]
</br>

std::thread 是 C++11 引入的标准线程库（在此之前是依赖原生平台的API，例如POSIX线程pthread、Windows线程），用于创建和管理操作系统级别的并发任务。C++多线程既可以支持并发（单核时间片轮转），也支持多核并行（多核同时运行多个线程）。

## 线程的创建、结合(join)、分离(detach)

std::thread是C++并发编程的线程对象



## RAII in std::thread

考虑下面的程序段：
```cpp
void dangerous_func(){
    std::thread t(task); // 创建线程
    /*
    中间一大段逻辑，可能会抛出异常
    */
    t.join(); // 等待线程结束
}
```
线程`t`在结束之前，中间代码抛出了异常，函数会直接中断，`t.join();`不会执行。当对象`t`离开作用域（即dangerous_func函数）构析（即注销对象，释放对应存储空间）时，`t`的线程还在运行，这时候程序就会崩溃。

这是因为持有线程的对象已经构析了，线程还在运行的话，会造成系统资源泄露。类似于内存泄漏，不再用到的对象一直占用内存空间，持有线程的对象构析后“野线程”继续访问内存执行计算是非常危险的。

不只是因为程序中断导致线程对象构析而线程继续运行，还有可能用户在函数结束前忘记join()或者detach()线程了，这同样会造成问题。正如Effective C++里面说的，不要指望用户能永远正确，永远保持头脑清醒，并且记得管理好所有对象。

这里遇到的困境和内存资源管理时一样，函数之间逻辑出现中断，部分对象没有执行构析函数，导致内存从未被释放，进而导致内存泄漏。这里也会使用RAII来保证线程对象构析时，线程必须join()或者detach()。

C++20前通常会采用类来封装thread：
```cpp
class ThreadGuard {
    std::thread& t;
public:
    explicit ThreadGuard(std::thread& t_) : t(t_) {}
    ~ThreadGuard() {
        if (t.joinable()) t.join();
    }
    ThreadGuard(const ThreadGuard&) = delete;
    ThreadGuard& operator=(const ThreadGuard&) = delete;
};

// 用法
std::thread t(task);
ThreadGuard guard(t);
// 即使后续抛出异常，guard 析构时会 join()
```

核心就是thread对象被构析时，必须把线程join()或者detach()，要么接受线程，要么让线程在后台安全地继续运行，和RAII里对象构析必须释放其持有的资源是一样的。