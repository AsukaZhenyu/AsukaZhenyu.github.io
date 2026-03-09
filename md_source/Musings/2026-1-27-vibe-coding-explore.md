## Vibe coding 初探

最近在看怎么弄AI编程，此前我的工作流是：VSCode写代码，然后打开豆包、DeepSeek网页，在另外的网页里对话，然后复制粘贴代码。

在豆包、DeepSeek和QWen网页上用，体验太差了。codeforces上rating1900左右的题就开始胡言乱语，之前在做专业课程设计、冯如杯还有别的项目，给的代码质量非常差。而且它老是跑偏，即使你明确说了需求，附上的文件，它还是会跑偏。我想我也不用再多费口舌去说明在网页上与LLM交互编程的低效和愚蠢。

一个思路是获取更好的模型，弄代理去访问Gemini、Claude等欧美顶尖的闭源模型，我也试了挺多代理工具与机场。包括CuteCloud，这个对于入门来说非常方便（代理工具和机场集成在一块），可以按量购买对轻度用户非常友好（现在注册还要邀请码，可以试试ccc），缺点是不太稳定，加载比较慢。我现在不推荐用CuteCloud，在IOS上的支持非常差，基本上不能用。我现在的配置是：机场用Mutdot，win上代理工具用mutdot配套的FlClash，IOS上用shadowrocket，在Linux上用mihomo代理，和Mudot配套支持很方便。这个用得稳定很多，加载速度也更快，月16元也足够用。不要去找小机场，基本上你买了用不了几天就会跑路。

我最开始是在手机上注册这些LLM软件的，包括OpenAI的Chat GPT、Google的Gemini、xAI的Grok，经过我的使用发现，Grok只能用于聊天，其能力并不优于豆包，ChatGPT能力优于Grok，但是对于免费用户限制太强了，基本上用不了多少就到限制了，而且我在X上刷到Sam的帖子说对于免费用户GPT还要接入广告。Gemini的能力最强（寒假回来给小朋友辅导物理，豆包基本上在胡说八道，但是Gemini都能解释得很好，非常方便），免费版的限制也最弱，是最适合使用的LLM。但是悲剧的是当我在网页端访问Gemini的时候，却不让我访问了。好像是因为IP行为异常吧（不清楚他们的协议，X在挂梯子时必须固定节点，如果挂的是自动就非常容易被封，Facebook好像是挂梯子就是IP异常，写邮件申诉照样被驳回了），而且Google的文档上也没说如何解决只能等。

所以基本上确定了，接下来有开发的需求，肯定是Gemini和Claude二选一，但是我Gemini的网页版用不了。于是我就去看看能不能用Claude。但实际上Claude对于中国用户更加不友好，2025年9月开始，Anthropic就加强了对中国控制用户的使用限制，在X上也有很多人说刚充了200$就被封了，而且注册Claude也非常麻烦，需要美国手机卡、美国信用卡、地址。理论上来说你可以联系美国转运公司，并且有专门针对中国人的信用卡发行商，理论上肉身在中国也可以注册，但是它还会验证浏览器指纹巴拉巴拉，基本上很难注册成功，也很难去使用。

我在VS Code里安装了两个插件，一个是Github Copilot，一个是Roo Code。Github Copilot现在非常方便，有Agent、Ask、Edit、Plan的模式，而且copilot还有免费的若干模型的使用额度。

Roo Code也是一个AI编程插件，可以有各种模式，它本身并不是LLM，它调用不同的LLMs，可以与开发深度融合，修改文件，执行终端命令，更好的上下文理解等等。Roo Code也是比较推荐的，它的自定义能力比Copilot更强一些。

到现在还是不能调用最优秀的模型，这时候就要提到Open Router了

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271230134.png)

这应该是非常方便的一个工具了，可以把各种开源模型、闭源模型都集成在一块，然后通过API调用。只要OpenRouter不制裁，这些模型就都可以用。copilot和Roo Code都可以调用OpenRouter的API。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271233554.png)


在这里购买API使用额度：
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271234557.png)

可以用加密货币买，我是用visa卡买的。好像银联的卡也可以买，但我没试过。北航入学的时候会有一张工行的银联储蓄卡，奖学金和补助会发到这张卡上，但是这张卡不能用来买额度。

之前我和同学一起出国旅游的时候办了一张工行的星座visa信用卡学生版，没有年费，没有福利也没有额度。用于境外消费非常方便（因为没有额度所以消费前要提前购汇），而且在国内用这个信用卡买单偶尔也可以薅10块20块的羊毛。办这个卡也很方便，在手机APP上申请，信用卡会邮寄给你，然后去线下工行柜台激活就可以用了。

在创建Key的时候，可以设置tokens耗费金额的上限，防止Agent陷入死循环，或者你不小心让它去读很大的项目，导致烧穿钱包。读入的tokens和输出的tokens都会计费。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271302929.png)



到现在我可以在VS Code里，通过copilot或者Roo Code调用最优秀的模型，并且深入开发过程，可以自动修改文件、执行命令。在模型的能力和开发的流程上都升了一级。

--------

但是最新的Agent Skills这些最新的AI编程工具，都是针对Claude Code开发的，最好还是使用Claude Code。

关于Claude Code的**工作原理**，Agent、LLM与MCP、SKills的关系可以看看下面的视频：BV1AuzkBREhx

看了上面的视频就能理解下面Gemini老师说的：“工具链稳定性极差”是什么意思。Claude Code可以视为Agent，它做的事情就是：

- 收集信息
- 解析结果
- 调用工具

Claude Code把“用户请求”、“收集到的信息”、“系统提示词（你是一个xxx，你的本职工作是xxx，你可以使用xxx工具）”以及“调用工具列表”发送给LLM，让LLM进行推理，LLM推理完成讲结果或者下一步指示（下一步调用什么工具）发送给Claude Code。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271621317.png)

Claude Code我的理解是：prompt完善器 + Agent执行器 + 工具箱（把原本开发流程中，需要人员重复的手动操作的工作，用网页与LLM交互做过项目的人都知道，每次提问如果不把要求说详细、说清楚，LLM就会跑偏，Claude Code每次发送请求都会把历史记录和所有应该有的信息发过去，虽然会浪费tokens，但是好在准确），Claude Code本身自带17个工具，如果我们想新加一些工具，需要用MCP去注册新的工具，然后才能被Claude Code调用。

理解MCP的核心是，LLM只能做字符上的推演，它本身不能调用任何函数，执行任何命令。LLM的输入是字符串，输出还是字符串。MCP是一种协议，它告诉LLM一些信息，当LLM在处理请求的时候意识到需要调用这个新工具，就会根据MCP的内容，返回调用该工具的指令、参数。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271628013.png)

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271640985.png)

Claude和Claude Code都由Anthropic公司开发，适配性肯定更强，但是了解了原理后，我认为只要LLM的文本推理能力不太差，基本上都能和Claude Code配合使用。智谱AI的GLM4.5据说是针对Claude Code的接口优化后的，所以有有很多人推荐使用GLM4.5配合Claude Code。而且我看了一下GLM的价格，和UU加速器的季卡差不多，不算太贵，算是性价比首选。而且我们也可以根据不同模型的特点选择不同的LLM作为推理的大脑，需要推理能力可以用DeepSeek R1，需要大容量上下文窗口可以用Gemini 2.5 pro，还可以自己在本地部署小LLM，在网上找Claude Code开源平替，例如Opencode、Aider，自己去魔改做一些小项目，读一读本地的论文、笔记、代码、会议记录，爬取网上的资讯然后让LLM进行一些简单的推理。我现在的机器是RTX 4070 laptop 8GB显存，可以跑一些简单的LLM和多模态模型。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271248817.png)

-----------



我打算通过**Claude Code Router（CCR）**+ Claude Code配置我的终极vibe coding开发环境。我可以把它接到智谱AI的API、硅基流动的API、Open Router的API、DeepSeek的API、Gemini的API，还可以自己租服务器部署LLM并微调，本地的LLM，需要哪个就用哪个。我更可以连接OpenRouter里的Claude Opus模型，就是原生搭配的模型，不需要注册，也不用担心封号，用多少买多少。（目前的情况是：deepseek的推理模型不支持Claude Code的接口，会报错不能正常使用，GLM目前正在扩容，对调用的并发度有限制）


CCR可以劫持Claude Code的请求，转发调用其他的模型API，从而实现Claude Code的所有功能，并且可以使用最新的Agent Skills等功能。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271157439.jpg)

上述[图片](https://youtu.be/3VLsxu9TnmA?si=11RNaaYj5xEftrvt)也是配置Claude Code Router的教程视频，但是我不建议参考这个视频的配置过程。

让我们来看看Gemini老师的分析：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271258020.png)

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271258647.png)

-----------

Claude Code的**使用**，可以看看这个视频：BV14rzQB9EJj

一些使用方法，常见命令，常见操作。上面提到可以回滚，这个确实是解决了很多直接与LLM交互进行开发的痛点。

Claude Code的**配置**，我目前使用Windows11操作系统，我尝试直接在win11的环境下安装失败了，我打算在WSL Ubuntu里进行配置。

我的版本：Ubuntu 24.04.1

（下面是WSL网络与代理配置）

如果在启动wsl前开了代理显示：**wsl: 检测到 localhost 代理配置，但未镜像到 WSL。NAT 模式下的 WSL 不支持 localhost 代理。** 原因是wsl2的127.0.0.1指向的是wsl下的Linux系统的localhost，而不是windows系统。代理的原理是：所有的网络请求先转发到127.0.0.1:7890这个端口，代理软件会监听这个端口的所有请求，并且根据配置规则决定哪些请求直接访问，哪些请求经过加密伪装后绕过GFM转发到境外的代理服务器，服务器进行解密并发起一个新的https请求，获得回应后再进行加密传回本机。

在wsl上如果配置代理转发到127.0.0.1:7890，这个端口不会被运行在win系统上的代理软件监听，请求也不会得到回应。所以需要获得Windows系统本机的ip地址，由于这个ip地址会改变，所以下面的配置麻烦一点。如果直接在Linux环境里配置就简单一些，直接根据代理的配置文件设置转发端口即可。

豆包的解决方法：
```bash
# 编辑bash配置文件（如果用zsh则改~/.zshrc）
nano ~/.bashrc

# 在文件末尾添加以下内容（自动获取网关IP，无需手动改）
export host_ip=$(ip route | grep default | awk '{print $3}')
export http_proxy=http://${host_ip}:7890
export https_proxy=http://${host_ip}:7890
export ALL_PROXY=http://${host_ip}:7890
export no_proxy=localhost,127.0.0.1,${host_ip},*.local

# 保存并退出（nano中按Ctrl+O → 回车 → Ctrl+X）
# 使配置立即生效
source ~/.bashrc
```

这样设置完了后，还是有问题，下面是当时我的Windows主机IP地址，我ping本机的ip地址发现wsl与本机间无法正常通信：

```bash
lzy@liuzhenyu:/mnt/c/Users/89664$ ping 172.21.80.1 -c 4
PING 172.21.80.1 (172.21.80.1) 56(84) bytes of data.

--- 172.21.80.1 ping statistics ---
4 packets transmitted, 0 received, 100% packet loss, time 3355ms

Ethernet adapter vEthernet (WSL (Hyper-V firewall)):

   Connection-specific DNS Suffix  . :
   Link-local IPv6 Address . . . . . : fe80::c19b:f5ef:6a9c:edbc%54
   IPv4 Address. . . . . . . . . . . : 172.21.80.1
   Subnet Mask . . . . . . . . . . . : 255.255.240.0
   Default Gateway . . . . . . . . . :
```

说明：WSL2 无法连通 Windows 的 WSL 虚拟网卡

解决方法（注意：下面是我和LLM的调试过程，过程不一定对，请不要当教程照做，而是仅参考可能是哪些情况导致无法互联）：

关掉代理，在管理员powershell里执行：
```bash
# 1. 允许WSL虚拟网卡的ICMPv4入站请求（针对vEthernet (WSL (Hyper-V firewall))）
New-NetFirewallRule -DisplayName "WSL-HyperV-ICMP" -Direction Inbound -InterfaceAlias "vEthernet (WSL (Hyper-V firewall))" -Protocol ICMPv4 -Action Allow -Enabled True
# 2. 允许WSL网段的ICMP出站请求（兜底）
New-NetFirewallRule -DisplayName "WSL-Net-ICMP" -Direction Outbound -RemoteAddress 172.21.80.0/20 -Protocol ICMPv4 -Action Allow -Enabled True
```

结果：

```bash
(base) PS C:\Users\89664> wsl
lzy@liuzhenyu:/mnt/c/Users/89664$ ping 172.21.80.1 -c 4
PING 172.21.80.1 (172.21.80.1) 56(84) bytes of data.
64 bytes from 172.21.80.1: icmp_seq=1 ttl=128 time=0.507 ms
64 bytes from 172.21.80.1: icmp_seq=2 ttl=128 time=0.490 ms
64 bytes from 172.21.80.1: icmp_seq=3 ttl=128 time=0.527 ms
64 bytes from 172.21.80.1: icmp_seq=4 ttl=128 time=0.481 ms

--- 172.21.80.1 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3051ms
rtt min/avg/max/mdev = 0.481/0.501/0.527/0.017 ms
```

目前是解决了wsl与Windows本机互联的问题，但是目前curl github还是没有反应：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601281406553.png)

可能是代理软件恰好没有代理172.21.**网段的请求。我把那一行给删了

还有前面的bashrc的设置：
```bash
export no_proxy=localhost,127.0.0.1,${host_ip},*.local
```
把自己给跳过了（豆包你又在胡说八道），所以把`${host_ip}`删掉了。

还是不行：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601281418674.png)

然后就可以了。

总结一下我WSL网络与代理配置：一方面要解决WSL虚拟网卡与windows本机的互联问题：WSL虚拟网卡的权限问题，TCP连接的权限问题，还有是代理软件必须要监听到WSL网段；另一方面则是要在Linux环境下设置代理环境变量，告诉运行再Linux环境里的软件要经过代理。

实际上还有一种解决方法，直接在wsl2的Linux环境下安装Linux的代理软件，那么上面的这些P事就都没有了，反正安装支持clash内核的代理软件，随便哪个，在一个机场买的流量对应的配置文件都可以用。

先安装nvm：
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

因为此前我是用hexo来管理个人博客的，但是因为我已经不再使用hexo了，所以我先卸载了，防止后续的冲突：
```bash
C:\Users\89664>npm uninstall -g hexo

removed 88 packages in 2s
```

现在要激活nvm，可以按安装的指示，也可以重开终端，我选择重开终端。

安装node.js LTS版本：
```bash
nvm install --lts
```

验证安装：
```bash
lzy@liuzhenyu:/mnt/c/Users/89664$ node -v
v24.13.0
lzy@liuzhenyu:/mnt/c/Users/89664$ npm -v
11.6.2
```

先宏观上说说如何配置ccr：你需要先配置ccr（API提供商、API密钥），然后才能启用ccr的劫持服务，并通过ccr启动Claude Code，ccr的README是让你直接去编辑config.json文件，这个比较复杂，但是你可以去ccr ui去编辑，它会给模板，只需要简单的配置就行了。

接下来安装Claude Code：（这一步开始可以参考这篇[博客](https://rosetears.cn/archives/61/)，对应的B站视频BV15phrzqEzK）

```bash
npm install -g @anthropic-ai/claude-code
```

验证安装：
```bash
lzy@liuzhenyu:/mnt/c/Users/89664$ claude -v
2.1.21 (Claude Code)
```




先输入
```bash
ccr ui
```
先配置好API提供商的基本信息还有API_key

----
下面的代理配置是错的，我想当然地跟着视频去做的，因为宿主IP一直在变化，后面我又把代理改回去了（127.0.0.1:7890），但是目前也能正常使用，有可能ccr的代理不是必须的，我的建议是先直接去使用ccr code，如果出现了问题再根据报错信息去调试。

然后输入
```bash
lzy@liuzhenyu:~/.claude-code-router$ code ~/.claude-code-router
```
在VS Code中打开配置文件，因为我是在WSL上弄的，这里生成的文件没有挂载在Windows的文件系统里，需要去Linux的文件系统里去找。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601281657475.png)

然后要设置代理地址：
```json
"PROXY_URL": "http://172.21.80.1:7890"
```
这里因为我在WSL上，所以代理地址和WSL上设置的一致，如果你在win上就按上面的教程来就行了。

----

然后
```bash
ccr restart
ccr code
```
这时候你如果成功进入设置界面，应该就是成功了，然后他会让你登陆，我选的是第二个按API计费，这时候会跳转到Anthropic的登陆界面，我使用Google账号登陆的。然后就可以正常使用了。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601281650721.png)

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601281650852.png)

这时候可以看到，虽然不能在claude code里调整模型选择，你可以在ccr ui里进行选择，可以看到我这里调用的是Openrouter的Gemini模型，在openrouter扣的费。

关于ccr ui模型的设置，建议全部选一样的，如果你想用哪个模型，不要仅仅把它设为默认模型，它会根据你的实际情况选择不同模型，有段时间我把默认设为了deepseek chat然后就开心地做项目去了，还发现效果非常不错，而且deepseek的API只花费了<1rmb，当时觉得这太完美了，后面才发现对话到一定长度后它调用了设置中的长上下文推理模型，当时我设置的是gemini，项目实际花费了>5$

------------------



（补）突然发现我的Gemini网页版又可以使用了：
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271204075.png)

如果你也出现Gemini网页版不可以访问，但是IOS App可以使用的情况，大概率就是IP行为的问题（不是你的账号问题），手机的梯子恒挂一个节点，电脑的梯子也恒挂一个节点，我都是挂的相同的美国节点，挂一段时间后就可以使用了。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271316294.png)

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202601271316804.jpg)