# BUAA CO 15系P2课上

[toc]

## 课上实验简单回顾

因为我是15系的学生，学的是简单版本的CO，只需要做到单周期CPU，6系的P4其实是我们的P2。我们直接Verilog，不做logisim，P1就是MIPS汇编，P2是单周期CPU，一共只有两次课上实验，我在准备时参考了大量6系学长的博客，但是没看到15系学长留下的信息，这可能是不同院系之间的文化差异吧。

我们课上也比较简单，两个计算型的指令，还有一个sb指令。课下的时候根据往届学长的建议添加了sb、sh、lb、lh指令，本来应该可以速通的，但是被两个bug拖到快下课才弄完。

一个是课下测试add和sub两个指令的编码，只有add和sub，但是课上包括了add、addu、sub、subu，意识到这个后前面两个计算型指令就完成了。

二是sb在实现的时候，参考往届学长代码，大概是这样：
```verilog
assign byte=A[1:0];
```
这种变量命名方式在判断的时候会出问题，避免这种变量的命名方法。尽量不要有变量命名为byte等特殊名称，否则检测的时候会出问题。


## 复杂计算方式

在一些新的指令中（例如：跳转判断、访存判断 ），可能涉及加减乘除、简单位运算、拼接之外的新的计算方式，新的计算方式可能会比较复杂，例如：

GPR[rs]/GPR[rt]的1个数、反转低imm位、是否有连续6位1、GPR[rs]对称
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

## 新增指令综述

P2课上之前一直再看往年的课上考题，自己没用上，总结在下面：

历年课上题目有三类：计算型、跳转型、访存型

计算型指令：
读指令 -> 控制器译码 -> 从寄存器堆GPR取数 -> 数送到ALU进行运算 -> 结果写入GPR -> PC+4（NPC）

跳转型指令：
分为无条件跳转J型和有条件跳转B型，一般都是B型，因为可以考察你复杂计算的实现，链接link指的是，确定跳转后，实际跳转前，$GPR[31] \leftarrow PC + 4$，与这点相对应的是，我们在写汇编时，需要调用s型指令把$GPR[31]$保存到内存，在函数结束时需要从内存中恢复$GPR[31]$和PC

访存型指令：
分为加载到寄存器堆GPR的l型与保存到内存mem的s型

单周期 CPU 中，同一个硬件功能单元不能在一个周期内被“先用一次，再换输入继续用第二次”来完成两个有先后依赖的计算。


## 计算型指令

2024T1：[北航CO 2024 P4课上部分题目回忆与分析 | Lazyfish & chilly_river](https://lazyfish-lc.github.io/2024/11/04/BUAA-CO-P4-test/index.html)

`eam`，R型指令，GPR[rs][15:0]作为有符号数对17取模，结果必须在0~16中，若GPR[rt]最高位为1，就将结果零扩展到32位，否则一扩展到32位，将最终结果存储到GPR[rd]中

2023T1：[2023北航计组p4课上部分-CSDN博客](https://blog.csdn.net/i_want_ak_noip/article/details/134255374)

`hmo rd,rs,rt`R型指令，RTL描述：
count()计算1的数量
$$
GPR[rd] \leftarrow max(count(GPR[rs]),count(GPR[rt]))
$$

2020T2：[[BUAA-CO-Lab] P4 单周期 CPU - 2 | ROIFE BLOG](https://roife.github.io/posts/buaa-co-lab-p4/)

`xor`计算指令

2021T1：[P4 课上测试 - 北航计算机组成原理 | Test Blog = FlyingLandlord's Blog](https://flyinglandlord.github.io/2021/11/17/BUAA-CO-2021/P4/P4%E8%AF%BE%E4%B8%8A%E6%B5%8B%E8%AF%95%E6%B8%B8%E8%AE%B0/)

`rlb rt,rs,imm`，指令形式：
|31:26|25:21|20:16|15:0|
|-|-|-|-|
|111111|\$rs地址|\$rt地址|16位立即数imm|

RTL语言描述：
$$
\begin{aligned}
&if\quad imm \ == \ 0 \ then\\
&\quad GPR[rt] \leftarrow GPR[rs] \\
&else\\
&\quad GPR[rt] \leftarrow rs[31:imm] ||inverse(rs[imm-1:0]) \\
\end{aligned}
$$

## 跳转并链接类：主要是有条件跳转
满足条件：跳转并链接
否则：PC+4

链接要对GPR[31]写入PC+4，RegWrite信号与条件相关，和jal的行为相似
但是由于没考虑延迟槽所以题目给的RTL和英语文档里的RTL不一样。

2021秋T2：[P4 课上测试 - 北航计算机组成原理 | Test Blog = FlyingLandlord's Blog](https://flyinglandlord.github.io/2021/11/17/BUAA-CO-2021/P4/P4%E8%AF%BE%E4%B8%8A%E6%B5%8B%E8%AF%95%E6%B8%B8%E8%AE%B0/)
[【BUAA_CO_LAB】计组p3&p4碎碎念-CSDN博客](https://blog.csdn.net/cedr1c_wyc/article/details/121391976)

`bnezalc rs,offset`，指令形式：
|31:26|25:21|20:16|15:0|
|-|-|-|-|
|000001|rs地址|10011|offset|

RTL语言描述：
$$
\begin{aligned}
&if\quad GPR[rs]!=0 \quad then\\
&\quad PC \leftarrow PC+4+sign\_ext(offset<<2) \\
&\quad GPR[31] \leftarrow PC+4 \\
&else\\
&\quad PC \leftarrow PC+4 \\
\end{aligned}
$$

2020T1：[[BUAA-CO-Lab] P4 单周期 CPU - 2 | ROIFE BLOG](https://roife.github.io/posts/buaa-co-lab-p4/)

`bsoal`指令，RTL语言描述：
​$$
\begin{aligned}
&if\quad has\_odd\_one\_bits(GRF[rs]) \quad then\\
&\quad PC \leftarrow PC+4+sign\_ext(offset<<2) \\
&\quad GPR[31] \leftarrow PC+4 \\
&else\\
&\quad PC \leftarrow PC+4 \\
\end{aligned}
$$
 


2023T2：[2023北航计组p4课上部分-CSDN博客](https://blog.csdn.net/i_want_ak_noip/article/details/134255374)

`abcd rs,rt,label`
若GPR[rs]与GPR[rt]相加或相减不会溢出时，跳转并链接。

2024T2：https://lazyfish-lc.github.io/2024/11/04/BUAA-CO-P4-test/index.html

`cptl` 指令，`has6ones()`表示，RTL描述：

​$$
\begin{aligned}
&if\quad has6ones(GRF[rs][17:0]) \quad then\\
&\quad GPR[rt] \leftarrow PC+4 \\
&else\\
&\quad GPR[31] \leftarrow PC+4 \\
&endif\\
&PC \leftarrow PC+4+sign\_ext(offset<<2) \\
\end{aligned}
$$

## 访存型：分为l型和s型
2024T3：[北航CO 2024 P4课上部分题目回忆与分析 | Lazyfish & chilly_river](https://lazyfish-lc.github.io/2024/11/04/BUAA-CO-P4-test/index.html)

`olw`，l型指令，从DM中读取起始地址为$GPR_{base}+sign\_ext(offset<<2||0^2)$（相当于offset*4）的一整个字，若该结果为单调不降的数（若某位出现了1，则其更低位只会出现1），则将该结果写入`GPR[rt]`，否则什么也不写入。

$$
\begin{aligned}
&Addr \leftarrow GPR[base] + sign\_ext(offset \,\|\,2'b00)\\
&temp \leftarrow mem[Addr]\\
&if\quad temp\ \&\ (temp+1)=32'b0 \quad then\\
&\quad GPR[rt] \leftarrow temp
\end{aligned}
$$

2023T3：https://blog.csdn.net/i_want_ak_noip/article/details/134255374

二进制 -> 格雷码 $ G = B \oplus (B>>1) $
格雷码 -> 二进制 $ B_i = G_i \oplus B_{i-1} $，$B_{-1}=0$，即最高位相同

`abcd base rt offset`s型指令，指令RTL描述：
$$
\begin{aligned}
& Addr \leftarrow GPR[base] + sign\_ext(offset)  \\
& temp \leftarrow Addr_{1..0}  \\
& if\ gray(GPR[rt][31:24])==mem[Addr][temp*8+7:temp*8] \\
& or \ gray(GPR[rt][23:16])==mem[Addr][temp*8+7:temp*8] \\
& or \ gray(GPR[rt][15:8])==mem[Addr][temp*8+7:temp*8] \\
& or \ gray(GPR[rt][7:0])==mem[Addr][temp*8+7:temp*8] \\
& then  \\
& \quad mem[Addr][temp*8+7:temp*8] \leftarrow gray(GPR[rt][temp*8+7:temp*8]) \\
& else \\ 
& \quad mem[Addr][temp*8+7:temp*8] \leftarrow 8'b11111111 \\
\end{aligned}
$$

**2021T3**：[P4 课上测试 - 北航计算机组成原理 | Test Blog = FlyingLandlord's Blog](https://flyinglandlord.github.io/2021/11/17/BUAA-CO-2021/P4/P4%E8%AF%BE%E4%B8%8A%E6%B5%8B%E8%AF%95%E6%B8%B8%E8%AE%B0/)
`lwrr`l型指令，指令描述：
|31:26|25:21|20:16|15:0|
|-|-|-|-|
|110100|base|$rt地址|offset|

指令格式：
lwrr rt, offset(base)

RTL语言描述：
$$
\begin{aligned}
& Addr \leftarrow GPR[base] + sign\_ext(offset)  \\
& temp \leftarrow Addr_{1..0}  \\
& if\ temp == 0 \ then  \\
& \quad GPR[rt] \leftarrow mem[Addr] \\
& else \\ 
& \quad GPR[rt] \leftarrow mem[Addr]_{8*temp-1...0}mem[Addr]_{31:8*temp} \\
\end{aligned}
$$

**2020T3**：[[BUAA-CO-Lab] P4 单周期 CPU - 2 | ROIFE BLOG](https://roife.github.io/posts/buaa-co-lab-p4/)

`swrr`s型指令，循环位移，RTL语言描述：
$$
\begin{aligned}
& Addr \leftarrow GPR[base] + sign\_ext(offset)  \\
& temp \leftarrow Addr_{1..0}  \\
& if\ temp == 0 \ then  \\
& \quad mem_{addr} \leftarrow GPR[rt] \\
& else \\ 
& \quad mem_{addr} \leftarrow GPR[rt]_{8*temp-1...0}GPR[rt]_{31...8*temp}
\end{aligned}
$$
