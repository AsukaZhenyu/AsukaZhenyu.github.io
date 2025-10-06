---
title: BUAA CO P4课上
date: 2025-05-25 21:04:44
tags:
---
其实这个标题并不严谨，因为我是15系的学生，学的是简单版本的CO，只需要做到单周期CPU，而这里的P4其实是我们的P2。

我们课上也比较简单，两个计算型的指令，还有一个sb指令。课下的时候根据往届学长的建议添加了sb、sh、lb、lh指令，本来应该可以速通的，但是被两个bug拖到快下课才弄完。

一个是课下测试add和sub两个指令的编码，只有add和sub，但是课上包括了add、addu、sub、subu，意识到这个后前面两个计算型指令就完成了。

二是sb在实现的时候，参考往届学长代码，大概是这样：
```verilog
assign byte=A[1:0];
```
之后再判断的时候会出问题，避免这种变量的命名方法。

课上之前一直再看往年的课上考题，自己没用上，总结在下面：

历年课上题目：计算型、跳转型、访存型
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252113575.png)
新的计算方式、B跳转判断、访存判断 新的计算方式可能会比较复杂：

- GRF[rs]、GRF[rt]的1个数、反转低imm位、是否有连续6位1、GRF[rs]对称
可以用for循环来做
```verilog
module bit_count_for_loop(
	input wire [31:0] num,
	output reg [5:0] count
);
integer i;
always @(*) begin
	count = 0;
	for(i = 0; i < 32 ; i = i + 1) begin
		if(num[i] == 1'b1)begin
			count = count + 1;
		end
	end
end

endmodule
```
这用到了寄存器，感觉不太好，因为单周期CPU除了数据存储部分其他都是组合逻辑，加入寄存器总感觉怪怪的。但是因为这里寄存器是异步更新的，不与时钟信号关联，所以是没有问题的。下面是函数实现，下面的count不是寄存器也不是wire，而是函数专门的一个数据类型。
```verilog
module bit_count_wire_loop (
    input wire [31:0] num1,
    input wire [31:0] num2,
    output  res
);

function [5:0] count;
input [31:0] num;
integer i;
begin
    count = 0;
    for (i = 0; i < 32; i = i + 1) begin
        if (num[i] == 1) begin
            count = count + 1;
        end
    end
end
endfunction

assign res = count(num1) > count(num2);

endmodule 
```

- 长的计算序列，先取低16位、符号扩展、取模，在verilog里用一个长表达式。数的拆分拼接用{}、[]、16{1’b0}、16{imm_16[15]}

- 相加相减是否溢出 参考王道书上三种方法，一个符号位，两个符号位，符号位进位和最高位进位。也可以参考英文指令集里判断溢出的做法。

### 计算型

2024T1：[北航CO 2024 P4课上部分题目回忆与分析 | Lazyfish & chilly_river](https://lazyfish-lc.github.io/2024/11/04/BUAA-CO-P4-test/index.html)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252121740.png)

2023T1：[2023北航计组p4课上部分-CSDN博客](https://blog.csdn.net/i_want_ak_noip/article/details/134255374)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252124577.png)

2020T2：[[BUAA-CO-Lab] P4 单周期 CPU - 2 | ROIFE BLOG](https://roife.github.io/posts/buaa-co-lab-p4/)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252125583.png)

2021T1：[P4 课上测试 - 北航计算机组成原理 | Test Blog = FlyingLandlord's Blog](https://flyinglandlord.github.io/2021/11/17/BUAA-CO-2021/P4/P4%E8%AF%BE%E4%B8%8A%E6%B5%8B%E8%AF%95%E6%B8%B8%E8%AE%B0/)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252126769.png)

### 跳转并链接类：bltzal、bnezalc、bsoal
满足条件：跳转并链接
否则：PC+4
链接要对GRF[31]写入PC+4，RegWrite信号与条件相关，和jal的行为相似
但是由于没考虑延迟槽所以题目给的RTL和英语文档里的RTL不一样。

2021秋T2：[P4 课上测试 - 北航计算机组成原理 | Test Blog = FlyingLandlord's Blog](https://flyinglandlord.github.io/2021/11/17/BUAA-CO-2021/P4/P4%E8%AF%BE%E4%B8%8A%E6%B5%8B%E8%AF%95%E6%B8%B8%E8%AE%B0/)
[【BUAA_CO_LAB】计组p3&p4碎碎念-CSDN博客](https://blog.csdn.net/cedr1c_wyc/article/details/121391976)

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252130604.png)

2020T1：[[BUAA-CO-Lab] P4 单周期 CPU - 2 | ROIFE BLOG](https://roife.github.io/posts/buaa-co-lab-p4/)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252131976.png)

2023T2：[2023北航计组p4课上部分-CSDN博客](https://blog.csdn.net/i_want_ak_noip/article/details/134255374)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252132482.png)

2024T2：https://lazyfish-lc.github.io/2024/11/04/BUAA-CO-P4-test/index.html
这题有链接和跳转两个部分，但是和上面的题目不太一样。B类是有条件跳转、J类是无条件跳转。
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252132714.png)

### 访存型：分为l型和s型
2024T3：[北航CO 2024 P4课上部分题目回忆与分析 | Lazyfish & chilly_river](https://lazyfish-lc.github.io/2024/11/04/BUAA-CO-P4-test/index.html)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252133372.png)

2023T3：https://blog.csdn.net/i_want_ak_noip/article/details/134255374
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252135898.png)
本题关于函数的定义：
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252135898.png)

2021T3：[P4 课上测试 - 北航计算机组成原理 | Test Blog = FlyingLandlord's Blog](https://flyinglandlord.github.io/2021/11/17/BUAA-CO-2021/P4/P4%E8%AF%BE%E4%B8%8A%E6%B5%8B%E8%AF%95%E6%B8%B8%E8%AE%B0/)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252136146.png)

2020T3：[[BUAA-CO-Lab] P4 单周期 CPU - 2 | ROIFE BLOG](https://roife.github.io/posts/buaa-co-lab-p4/)
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202505252137335.png)