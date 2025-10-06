---
title: CS144 Lab0
date: 2025-07-19 15:14:01
tags:
---

本篇记录Stanford CS144: Introduction to Computer Networking Winter 2025课程对应的实验Checkpoint 0的实验过程。实验指导手册直接从cs144.github.io下载pdf。

在check0中，需要配置环境、利用telnet获取网页、利用telnet发送邮件、利用netcat实现监听和连接、下载CS144的minnow库代码框架，利用Linux内核提供的TCP API实现webget程序、实现内存可靠比特流。

由于我没有Stanford学号，也上不了Stanford的网络，前面获取网页和发送邮件部分就不做了。

## 环境配置

可以直接安照实验指导书来，访问[https://stanford.edu/class/cs144/vm_howto/vm-howto-image.html](https://stanford.edu/class/cs144/vm_howto/vm-howto-image.html)，根据指导书来安装即可。遇到的问题是上面这个网址对应的Oracle VirtualBox的下载链接已经失效，需要手动去Oracle中国网站下载，VirtualBox安装全默认即可，剩余的安装步骤按照指导书来即可。

虚拟机开机后，实验指导书建议实验ssh远程连接虚拟机，使用本地VS code编辑代码，在VS code里安装Remote - SSH插件，根据指导书输入ssh -p 2222 cs144@localhost，ssh配置推荐选择用户级的SSH配置文件，只对当前的用户生效。在下图中就是第一个配置文件。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202507191534311.png)

直接根据实验指导书下载minnow是下载不了的，可能是权限问题，可能是仓库不存在，我访问不了不能下载，需要自己在GitHub上找好心人上传的minnow代码。我找到的地址是:
```bash
cs144@cs144vm:~$ git clone https://github.com/cry0404/minnow.git
```
这个仓库是2025winter版本，lab0-lab7分支是大佬实现好的版本，后续的lab会根据实验指导书的指示，删去大佬已经写好的.cc文件里的函数的实现代码，自己再实现一次。

## Listening and connecting
这部分难点是CS144给的虚拟机没有GUI，开机后直接是命令行界面，不知道如何开不同的终端，解决方案是使用tmux工具。

先输入tmux进入新的终端。
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202507191558334.png)

操作是先按“ctrl+b”松开后按不同按键达到不同效果。
- c 创建新的窗口
- n 切换到下一个窗口
- p 切换到上一个窗口
- % 将一个窗口左右切分窗口
- " 将一个窗口上下切分窗口

切分窗口后，可以按“ctrl+b”松开后按“方向键”来切换窗口。

那么实验过程是：输入tmux，按下“CTRL + b"后松开，按"上下分割窗口，然后根据实验指导书里进行操作，效果如下所示：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202507191606726.png)

通信的退出安装实验指导书里来，"ctrl + ]"，然后输入close即可退出通信，退出tmux：先按“CTRL + b"后松开，按"d"即可退出tmux。

## Webget

在GitHub新建名为minnow的仓库，注意设为隐私，然后在虚拟机上绑定仓库。

```bash
cs144@cs144vm:~/minnow$ git remote add github https://github.com/AsukaZhenyu/minnow
cs144@cs144vm:~/minnow$ git push github
```

编译初始代码
```bash
cmake -S . -B build
cmake --build build
```

实验指导书先说明了网络通信需要可靠的双向字节流，而计算机网络只做最大努力而不保障，可能出现丢包、乱序、内容变化、重复，需要在网络的边缘/端口实现可靠的双向字节流。（感觉是把端到端原理重复了一遍）

在这部分我们需要调用操作系统提供的，应用程序与TCP之间交互的Socket接口，实现用C++代码获取网页信息。

实验指导书给出了现代C++编写的规范，推荐RAII资源管理风格，在Effective C++第二章“用类管理资源”里提到RAII风格，并使用智能指针。实验指导书提供的几个代码行为准则都是Effective C++里1-2章提到过的内容。避免用户自行申请与回收资源、建议使用智能指针、避免C风格的字符串和强制类型转换、推荐使用常引用传参（提升性能）、类方法不改变类属性时标注为const（提升性能）。实验指导书还提到针对CS144的lab不需要模板、多线程、互斥锁和虚函数。

实验指导书建议使用Git项目管理工具，每做完一点就提交更新一次并标好注释。

代码接口阅读与Client套接字流程：
Socket类继承自FileDescriptor类，TCPSocket类继承自Socket类，FileDescriptor可以对文件缓冲区读写字符串，Socket类里实现了bind、bind_to_device、connect、shutdown函数，根据socket流程图：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202507201318978.png)

我们在Webget里要实现的就是客户端，建立套接字、连接服务器、发送HTTP请求、读取HTTP响应、关闭套接字。

我们要发送的内容形如：
```bash
GET /hello HTTP/1.1
Host: cs144.keithw.org
Connection: close

```
根据前面的实验指导书，最后一个换行不能省略，在HTTP中换行要'\r\n'，所以发送的字符串是：
```cpp
auto line1="GET "+path+" HTTP/1.1\r\n";
auto line2="Host: "+host+"\r\n";
auto line3="Connection: close\r\n\r\n";
```

地址构造：
```cpp
//! \param[in] service name (from `/etc/services`, e.g., "http" is port 80)
Address::Address( const string& hostname, const string& service )
  : Address( hostname, service, make_hints( AI_ALL, AF_INET ) )
{}
```
构造时输入：host地址和"http"字符串即可。

连接服务器，参考socket接口connect，输入地址即可。

关闭套接字，参考socket接口shutdown，输入SHUT_RDWR即可。
```cpp
// shut down a socket in the specified way
//! \param[in] how can be `SHUT_RD`, `SHUT_WR`, or `SHUT_RDWR`; see [shutdown(2)](\ref man2::shutdown)
```
分别是关闭读端、写端、读写端。我就是在最后一次性关闭读写端。代码shutdown，先进行系统调用，然后对FileDescriptor类的属性进行操作，具体就是指向Wrapper的智能指针的属性。

FDWrapper在析构的时候会自动调用FileDescriptor类的close函数，释放文件句柄，也可以自行调用close，在file_descriptor.cc里FDWrapper的析构函数定义考虑了这两种情况。
```cpp
FileDescriptor::FDWrapper::~FDWrapper()
{
  try {
    if ( closed_ ) {
      return;
    }
    close();
  } catch ( const exception& e ) {
    // don't throw an exception from the destructor
    cerr << "Exception destructing FDWrapper: " << e.what() << "\n";
  }
}
```


get_URL函数实现，这段代码通过了实验指导书给的自动化测试:
```cpp
void get_URL( const string& host, const string& path )
{
  cerr << "Function called: get_URL(" << host << ", " << path << ")\n";
  // cerr << "Warning: get_URL() has not been implemented yet.\n";
  auto address = Address(host, "http");
  auto tcpsocket = TCPSocket();
  tcpsocket.connect(address);

  auto line1="GET "+path+" HTTP/1.1\r\n";
  auto line2="Host: "+host+"\r\n";
  auto line3="Connection: close\r\n\r\n";
  tcpsocket.write(line1);
  tcpsocket.write(line2);
  tcpsocket.write(line3);

  string buffer;
  while(!tcpsocket.eof()){
    tcpsocket.read(buffer);
    cout<<buffer;
  }

  tcpsocket.shutdown(SHUT_RDWR);
}
```



Webget结果：
```bash
cs144@cs144vm:~/minnow$ ./build/apps/webget cs144.keithw.org /hello
Function called: get_URL(cs144.keithw.org, /hello)
HTTP/1.1 200 OK
Date: Sun, 20 Jul 2025 04:08:14 GMT
Server: Apache
Last-Modified: Thu, 13 Dec 2018 15:45:29 GMT
ETag: "e-57ce93446cb64"
Accept-Ranges: bytes
Content-Length: 14
Connection: close
Content-Type: text/plain

Hello, CS144!
```

自动化测试结果：
```bash
cs144@cs144vm:~/minnow$ cmake --build build --target check_webget
Test project /home/cs144/minnow/build
    Start 1: compile with bug-checkers
1/2 Test #1: compile with bug-checkers ........   Passed   26.47 sec
    Start 2: t_webget
2/2 Test #2: t_webget .........................   Passed    1.34 sec

100% tests passed, 0 tests failed out of 2

Total Test time (real) =  27.84 sec
Built target check_webget
```

用虚拟机跑性能较差，测试使用了30s，测试代码设置是15s就timeout，在运行测试时请修改etc/tests.cmake里的代码：
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202507191823908.png)


`cmake --build build`这一类命令直接重复跑会出错，简单的操作是：
```bash
rm -rf build
cmake -S . -B build
cmake --build build
```

webget弄完后，将minnow仓库push到GitHub上。
```bash
cs144@cs144vm:~/minnow$ git add .
cs144@cs144vm:~/minnow$ git commit -m "完成get_URL函数实现，完成自动化测试"
cs144@cs144vm:~/minnow$ git push github
```

http推送不稳定，尝试多次后才上传成果，据说使用ssh推送更稳定。


## 一个内存可靠的字节流

在单一计算机的内存内实现一个可靠的字节流，写者从写入端写入字节流，读者以相同的顺序读出字节流，写者可以终止写入，读者必须读到EOF。必须做流量控制，限制写者写入速度，防止容量溢出。字节流以单线程运行，不必考虑读者/写者问题、互斥以及竞争。字节流有限长，但是可以是任意长，可以远远大于容量的长度。

我的第一想法是用数组构造一个循环队列，原因是读出顺序和写入顺序相同，必须是FIFO，所以考虑队列。又从固定容量，写入速度限制等要求，又想实现简单，所以不采用链表，而是用数组构造循环队列。

循环队列要额外维护一个flag表示buffer是否已经满了，否则是无法判断begin=end+1时是空还是满的。

代码框架：属于“混合继承”，ByteStream类有各种资产，Reader和Writer没有资产，只有方法，继承自ByteStream类，Reader提供读接口，Writer提供写接口，共享同一组数据，通过引用转化，避免数据复制提高效率。

8 - byte_stream_stress_test (Failed)
原因是循环队列为空时会返回已经pop出来的字符，在peek函数里要注意判断buffer为空的特殊情况。

byte_stream.hh
```cpp
#pragma once

#include <cstdint>
#include <string>
#include <string_view>
#include <cassert> 

class Reader;
class Writer;

class ByteStream
{
public:
  explicit ByteStream( uint64_t capacity );

  // Helper functions (provided) to access the ByteStream's Reader and Writer interfaces
  Reader& reader();
  const Reader& reader() const;
  Writer& writer();
  const Writer& writer() const;

  void set_error() { error_ = true; };       // Signal that the stream suffered an error.
  bool has_error() const { return error_; }; // Has the stream had an error?

protected:
  // Please add any additional state to the ByteStream here, and not to the Writer and Reader interfaces.
  uint64_t capacity_;
  bool error_ {};
  uint64_t total_in=0,total_out=0;
  int queue_begin=0,queue_end=-1;
  bool writer_fin=false,buffer_full=false;
  std::string buffer,peek_buffer="";
};

class Writer : public ByteStream
{
public:
  void push( std::string data ); // Push data to stream, but only as much as available capacity allows.
  void close();                  // Signal that the stream has reached its ending. Nothing more will be written.

  bool is_closed() const;              // Has the stream been closed?
  uint64_t available_capacity() const; // How many bytes can be pushed to the stream right now?
  uint64_t bytes_pushed() const;       // Total number of bytes cumulatively pushed to the stream
};

class Reader : public ByteStream
{
public:
  std::string_view peek() const; // Peek at the next bytes in the buffer
  void pop( uint64_t len );      // Remove `len` bytes from the buffer

  bool is_finished() const;        // Is the stream finished (closed and fully popped)?
  uint64_t bytes_buffered() const; // Number of bytes currently buffered (pushed and not popped)
  uint64_t bytes_popped() const;   // Total number of bytes cumulatively popped from stream
};

/*
 * read: A (provided) helper function thats peeks and pops up to `max_len` bytes
 * from a ByteStream Reader into a string;
 */
void read( Reader& reader, uint64_t max_len, std::string& out );

```
byte_stream.cc
```cpp
#include "byte_stream.hh"

using namespace std;

ByteStream::ByteStream( uint64_t capacity ) : capacity_( capacity ),buffer( capacity,' ' ) {

}

void Writer::push( string data )
{
  // (void)data; // Your code here.
  uint64_t len = data.size();
  uint64_t res_len = buffer_full?0:capacity_-(queue_end+1-queue_begin+capacity_)%capacity_;
  // assert(len <= res_len);
  if (len > res_len) {
    len = res_len; // 丢掉多余的字节
    set_error(); // 发送溢出错误
  }
  if(len==res_len){
    buffer_full = true;
  }
  total_in += len;
  for(size_t i = 0; i < len; i++){
    queue_end=(queue_end+1)%capacity_;
    buffer[queue_end]=data[i];
  }
}

void Writer::close()
{
  // Your code here.
  writer_fin = true;
}

bool Writer::is_closed() const
{
  return writer_fin; // Your code here.
}

uint64_t Writer::available_capacity() const
{
  uint64_t res_len = buffer_full?0:capacity_-(queue_end+1-queue_begin+capacity_)%capacity_;
  return res_len; // Your code here.
}

uint64_t Writer::bytes_pushed() const
{
  return total_in; // Your code here.
}

string_view Reader::peek() const
{
  // assert(queue_begin>=0&&queue_end>=0&&queue_begin<capacity_&&queue_end<capacity_);

  // uint64_t peek_len_limit=10;
  if(!buffer_full&&(queue_end+1-queue_begin+capacity_)%capacity_==0){
    return "";
  }
  if(queue_begin<=queue_end){
    return string_view(buffer).substr(queue_begin,queue_end-queue_begin+1);
  }else{
    return string_view(buffer).substr(queue_begin);
  }
}

void Reader::pop( uint64_t len )
{
  // (void)len; // Your code here.
  // uint64_t buffer_len = buffer_full?capacity_:(queue_end+1-queue_begin+capacity_)%capacity_;
  // assert(len<=buffer_len);
  total_out += len;
  if(buffer_full&&len) buffer_full=false;
  queue_begin = (queue_begin + len) % capacity_;

}

bool Reader::is_finished() const
{
  return writer_fin && ( total_in==total_out ); // Your code here.
}

uint64_t Reader::bytes_buffered() const
{

  return buffer_full?capacity_:(queue_end+1-queue_begin+capacity_)%capacity_;
}

uint64_t Reader::bytes_popped() const
{
  return total_out; // Your code here.
}


```

自动化测试结果：
```bash
cs144@cs144vm:~/minnow$ cmake --build build --target check0
\Test project /home/cs144/minnow/build
      Start  1: compile with bug-checkers
 1/11 Test  #1: compile with bug-checkers ........   Passed   25.87 sec
      Start  2: t_webget
 2/11 Test  #2: t_webget .........................   Passed    1.06 sec
      Start  3: byte_stream_basics
 3/11 Test  #3: byte_stream_basics ...............   Passed    0.04 sec
      Start  4: byte_stream_capacity
 4/11 Test  #4: byte_stream_capacity .............   Passed    0.05 sec
      Start  5: byte_stream_one_write
 5/11 Test  #5: byte_stream_one_write ............   Passed    0.04 sec
      Start  6: byte_stream_two_writes
 6/11 Test  #6: byte_stream_two_writes ...........   Passed    0.04 sec
      Start  7: byte_stream_many_writes
 7/11 Test  #7: byte_stream_many_writes ..........   Passed    0.24 sec
      Start  8: byte_stream_stress_test
 8/11 Test  #8: byte_stream_stress_test ..........   Passed    0.10 sec
      Start 37: no_skip
 9/11 Test #37: no_skip ..........................   Passed    0.03 sec
      Start 38: compile with optimization
10/11 Test #38: compile with optimization ........   Passed    8.59 sec
      Start 39: byte_stream_speed_test
        ByteStream throughput (pop length 4096):  0.59 Gbit/s
        ByteStream throughput (pop length 128):   0.61 Gbit/s
        ByteStream throughput (pop length 32):    0.57 Gbit/s
11/11 Test #39: byte_stream_speed_test ...........   Passed    0.82 sec

100% tests passed, 0 tests failed out of 11

Total Test time (real) =  36.89 sec
Built target check0
```
速度测试不太理想，我看网上用queue<char>实现字节流速度好像可以达到10Gbit/s，但是基本满足实验指导书要求（>0.1Gbit/s）。我就不修改了。