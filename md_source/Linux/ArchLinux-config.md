# Arch Linux配置

Arch Linux安装完后啥也没有，即使弄好了neofetch/fastfetch，直接在TTY上显示也不好看，在穿上丝袜拍张自拍发到X上前，还要进行一些配置。

----

**About Time**

因为我的电脑电池完全坏了，之前每次拔电后再开机都要重新设置时间，在Arch的安装过程中，在安装盘和电脑上分别运行的下面的两个命令来同步时间：
```bash
timedatectl set-ntp true
```

```bash
ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
hwclock --systohc
```

使用date可以查看系统时间，拔掉电一段时间后看看时间会不会错。

拔掉电后一段时间重新开机，确实date输出的时间是错的。

输入：
```bash
timedatectl status
```
看下面的两项：
```bash
System clock synchronized
NTP service
```
这两项一开始是没有启动的

再执行一遍开启NTP网络自动校时
timedatectl set-ntp true
再date输出的就是正确的时间，再看上面两项现在就是启动了的

断电重启后时间还是不对，需要再运行一遍timedatectl set-ntp true才能正常显示时间

现在启动某个服务，并设置开机自启动：
```bash
sudo systemctl enable --now systemd-timesyncd
sudo systemctl enable --now NetworkManager
```
联网就能开机自动配置时间


----

**systemd**

[https://wiki.archlinux.org/title/Systemd](https://wiki.archlinux.org/title/Systemd)


systemtcl enable会全局开启服务
NPT服务
每次systemctl开启某个服务的时候，都会建立某种连接，并且和etc文件夹下的配置文件相关。

journaltcl

systemd-analyze

hostnamectl、timedatectl、localectl

----

**pacman**

[https://wiki.archlinux.org/title/Pacman](https://wiki.archlinux.org/title/Pacman)

系统更新（更新所有的包，除了本地的包）：
```bash
sudo pacman —Syu
```
这里会安装一些开发的基础的包，包括gcc，我认识的还有词法分析和语法分析工具。
```bash
sudo pacman —S man
sudo pacman -S base-devel
```


pacman只有系统的包，官方的包，如果要使用AUR，就得用AUR工具，例如yay paru，yay用go编写，paru用rust编写，一般认为paru是yay的现代上位替代。
```bash
git clone https://aur.archlinux.org/yay-bin.git
cd yay-bin
makepkg -si
```

查看具体有哪些包，知道名字里有yay，查看这个包具体是什么名字：
```bash
pacman -Qs yay
```

卸载：
```bash
sudo pacman -Rs yay-bin yay-bin-debug
```

清理缓存：
```bash
rm -rf ~/.cache/yay
```

安装paru-bin无法工作，好像是找不到某个库，安装paru用rust编译再试试。
命令和上面的相似，把-bin去掉就OK了，目前可以正常使用paru

paru在安装的时候，会进入review模式，他会给你一下下载的信息，你这是需要输入q退出才hi继续安装。

----



**联网**

（2025.3.10更新）
如果觉得下面的nmcli用起来太麻烦，可以试试:
```bash
sudo nmtui
```
直接在tui下联网，在连接校园网时特别方便，否则可能还要自己根据学校使用的网络协议自己新建con，然后配置证书之类的，非常复杂。

---

多个联网工具systemd-networkd、network manager、iwctl、wpa_suplicant等，只能有一个在运行，否则可能导致冲突。
使用systemctl来停止和启动服务，现在就保证只有network manager在运行。
```bash
sudo systemctl stop systemd-networkd
sudo systemctl disable systemd-networkd
sudo systemctl restart NetworkManager
```

通过`ip addr`来看无线联网设备wlan0有没有ip地址
通过`sudo ip link set wlan0 up`启动该无线联网设备

使用network manager不需要自己去配置DNS、dhcpcd（ip地址与子网掩码）、默认网关Gateway，就可以全部自动配置好，已经连接过了后会自动连接。

`nmcli device`命令可以查看网络连接情况(network manager command line interface)

多次重启发现network manager还是不稳定，重启后还需要重新运行：
```bash
nmcli device wifi connect "TP-LINK_481A" password "password"
```
来连接互联网，而且连接完后还有可能断开连接，也有可能是网络情况不稳定。后续再配置waybar运行一键重新连接互联网。

**代理**：
使用mihomo
```bash
paru -S mihomo
```
在机场下载yaml文件
放到：
```bash
~/.config/mihomo/config.yaml
/etc/mihomo/config.yaml
```

这里使用systemctl启动mihomo服务：
```bash
sudo systemctl enable  --now mihomo
```

然后是在~/.bashrc里加上http_proxy和https_proxy的地址，这个在wsl上之前也配置过了
```bash
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
```


----





**桌面环境DE**

接下来配置 桌面环境 Desktop Environment DE
GNOME 和 KDE这些是集成好了的DE 就什么都有可以开箱即用

arch刚安装完，我们面对的是系统第一个虚拟控制台tty1，tty是由linux内核提供的虚拟控制台/虚拟终端。真实终端指的是物理显示屏和键盘。

shell是运行在TTY或者终端模拟器上的程序，常见的有bash、zsh、fish
shell运行在TTY之上，我理解为命令行，你可以输入类似自然语言的预设命令，就可以调用系统完成某些任务。TTY是Linux最底层的文本输入输出，shell是进程运行在TTY和模拟终端中的命令解释工具。

当进入图形界面后就不能直接使用TTY了，必须安装终端模拟器在图形界面里使用命令行（当然也可以退出图形界面使用TTY）

先安装图形工具是对的，据我所知，只有滚挂的时候才会进入TTY修复，在图形界面下再运行模拟终端，由图形合成器提供的终端在字体、背景等观感上更美观。之后有什么工具、插件想要安装使用，还是在图形工具下的模拟终端里安装比较好（比如我现在想要安装的Yazi）。在阅读相关文档时也会看到在TTY和模拟终端之间有所不同。

在我的电脑上，super键指的就是win键。

我计划使用niri等，自己拼装一个DE。

|工具|功能|对应Windows|备注|
|-|-|-|-|
|niri|Wayland合成器|DWM|窗口管理器|
|XDG Desktop Portal|中间层|Windows API/权限中心|转发请求|
|Waybar|任务栏|||
|Mako|弹出系统通知|||
|Fuzzel|打开应用|开始/搜索/桌面图标|搜索应用的快捷方式给出列表，使用图形化的方式点击打开应用，无需打开模拟终端输入命令行启动|
|Swaybg|更换壁纸/设置背景图|个性化||
|Foot|模拟控制台|||

为什么需要XDG Desktop Portal这个中间层，这是出于安全考虑，类似于传达室大爷。外界任何请求，叫一个学生，送衣服，送餐都必须经过传达室大爷。防止恶意读取系统信息或访问系统资源，例如进入传销人员或者恐怖分子Allahu Akbar。不能让应用直接访问系统资源，好比不能让外人随意进入校园。

来自视频BV1fgUEBMEMZ，可能涉及到的包的名字与功能：
|名字|功能|
|-|-|
|niri|-|
|xwayland-satellite|-|
|xdg-desktop-portal-gnome|默认会安装nautilus文档管理器|
|fuzzel|菜单栏，提供打开应用的GUI方式|
|kitty|终端模拟器|
|libnotify|通知相关的库|
|mako|显示通知栏|
|polkit-gnome|方便应用询问管理员权限|


下面的部分是设置文档管理器nautilus相关的包
|名字|功能|
|-|-|
|ffmpegthumbnailer|视频缩略图功能|
|gvfs-smb|允许访问远程NAS服务器|
|nautilus-open-my-terminal||
|file-roller|压缩解压缩软件|
|gnome-keyring|密码保存|
|gst-plugins-base|视频信息预览功能|
|gst-plugins-good||
|gst-libav||


我不打算安装gnome的中控，也不打算使用其自带的文件管理系统
```bash
sudo pacman -S niri xwayland-satellite kitty fuzzel mako libnotify \
polkit-gnome xdg-desktop-portal xdg-desktop-portal-gtk xdg-desktop-portal-wlr
```

允许niri-session打开niri会话，会生成默认配置文件
`/home/yanagi/.config/niri/config.kdl`

在类Unix系统中，路径中的`~`会自动展开为`/home/yourusrname/`，你可以用`echo ~`来查看

```bash
mkdir ~/.config/xdg-desktop-portal
nvim ~/.config/xdg-desktop-portal/niri-portals.conf
```
写入：

```bash
[preferred]
default=gtk;wlr;
# 指定录屏和截图使用 wlr 后端
org.freedesktop.impl.portal.ScreenCast=wlr
org.freedesktop.impl.portal.Screenshot=wlr
# 指定文件选择器使用 gtk 后端
org.freedesktop.impl.portal.FileChooser=gtk
```

修改niri的配置
```bash
nvim ~/.config/niri/config.kdl
```

先搜索alacritty，这是niri默认的终端模拟器，把它修改为kitty
```bash
Mod+T hotkey-overlay-title="Open a Terminal:kitty"{spawn ""}
```

然后修改niri的启动配置，搜索spawn-at-startup
```bash
spawn-at-startup "xwayland-satellite" ":"
spawn-at-startup "mako"
spawn-at-startup "/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1"

// 建议添加：确保 Portal 环境变量在启动时正确加载
spawn-at-startup "dbus-update-activation-environment" "--all"
```

niri-session打开niri会话
super+T打开终端，接下来的任务在niri里的终端模拟器内去做，这个时候就可以通过鼠标和滚轮更加方便的去看终端里的信息，使用nvim时也可以用鼠标光标而不是hjkl。


**配置显示器**
nvim ~/.config/niri/config.kdl 继续编辑niri的配置文件
super T再打开一个终端，输入niri msg outputs，看当前显示屏支持的模式
mode就写niri msg outputs里推荐的
我的显示器分辨率是1366x768，scale就选1

**配置消息窗口**

`notify-send helloworld`可以发送一条信息
mako默认要鼠标点击一下才能关闭通知窗口
```bash
mkdir -p ~/.config/mako
nvim ~/.config/mako/config
```

输入：
```bash
default-timeout=8000
border-radius=8
```

`makoctl reload` 重启mako


**安装字体**
```bash
paru -S noto-fonts-cjk ttf-fira-code ttf-joypixels
```

- noto-fonts-cjk: 这是 Google 和 Adobe 联合开发的“思源黑体”，是目前 Linux 上最标准、最全的中文字体。cjk包括了中文日语韩语，都可以显示。
- ttf-fira-code: 推荐给程序员的字体，在 kitty 终端里看代码非常漂亮。
- ttf-joypixels: 让你能看到 Emoji 表情。

**安装浏览器**
```bash
paru -S google-chrome
paru -S firefox
```
选jack2，jack2 是传统的专业音频服务器，而 pipewire-jack 是新兴的 PipeWire 框架为了兼容 JACK 应用而提供的桥梁。

目前拿浏览器刷B站没有声音
我在waybar安装的是pulseaudio
启用该服务，并安装其他必要的包：
- `pulseaudio-alsa`: 让使用 ALSA 的程序（如 Firefox 某些组件）重定向到 PulseAudio。
- `pavucontrol`: 必装的图形化控制面板，这是排查声音去向的神器。
```bash
systemctl --user enable --now pulseaudio
sudo pacman -S pulseaudio-alsa pavucontrol
```

可以在niri的配置文件下设置window-rule，浏览器有透明度看起来不舒服。
```kdl
// 设置全局默认透明度
window-rule{
    opacity 0.8
}
window-rule{
    match app-id="firefox"
    opacity 1.0
}
window-rule{
    match app-id="google-chrome"
    opacity 1.0
}
```

**安装waybar**
```bash
sudo pacman -S waybar
# 推荐安装图标字体，否则状态栏会乱码
sudo pacman -S otf-font-awesome ttf-jetbrains-mono-nerd
```
otf-font-awesome安装后niri的字符不能正常显示改为安装，把上面两个字体的包都卸掉了
```bash
ttf-firacode-nerd
```
配置文件：
```bash
mkdir -p ~/.config/waybar
git clone 一个你喜欢的waybar主题
cp -r xxx ~/.config/waybar
```

不需要在niri设置启动时启动waybar，它自己会自动启动，如果设置了你会看到两天控制栏。

上面提到network manager连接有时不太稳定，可以自定义waybar去执行sh脚本或者命令。

**工作区**
Mod+O Overview
我把按键改为了：
Mod+(IKJL)来上下左右

----

**中文输入法**
添加archlinuxcn的源
```bash
sudo nvim /etc/pacman.conf
```
在最后加上
```bash
[archlinuxcn]
Server = https://xxx
```
安装archlinuxcn的密钥
```bash
sudo pacman -Sy archlinuxcn-keyring
```


安装和配置fcitx5，我在学习日语所以安装了fcitx5-mozc
```bash
# 一键安装中文 + 日语 + 词库 + 主题
paru -S fcitx5-im fcitx5-chinese-addons fcitx5-mozc \
 fcitx5-pinyin-zhwiki fcitx5-material-color
```

配置环境/etc/environment
```bash
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
SDL_IM_MODULE=fcitx
GLFW_IM_MODULE=ibus
```
在niri配置文件里设置启动时执行
```bash
spawn-at-startup "fcitx5" "-d"
```

目前就是日语输入法有点问题，之前在win上用日语输入法时也是需要手动变换日语输入法，换到日语输入法后还有两种模式，英文和假名。我希望达到的目的是按Shift在英中日三个模式里切换，目前还没解决。

**剪切板**

安装的是`wl-clipboard`

**截屏与录屏**

**蓝牙**

**壁纸**
使用swww和waypaper，swww是后端，waypaper是换壁纸的前端。
```bash
paru -S swww waypaper
```
要在niri里配置：
```bash
spawn-at-startup "swww-daemon"
```

**steam**

在配置`/etc/pacman.conf`的时候，对于不同的库，不同的源解去注释的时候，也要把上面的[]内的内容解注释掉，否则你的pacman还是找不到。



----

**关于配置文件**

上面的过程都可以抽象为：安装某个功能的包，配置某个系统文件（让系统知道你要使用这个工具），配置工具自己的配置文件（快捷键绑定，个性化表现形式），配置工具与工具间的配置文件（比如在niri里配置模拟终端，应用搜索应用等，也就是说工具之间可能存在依赖关系）。

在配置配置文件的时候，我们会新建一些文件夹和文件，这时候系统和工具怎么知道它要遵守这些配置文件呢？这些文件夹和文件的命名，是系统和工具自己定义的吗？

----

**xorg、x11、wayland以及集成桌面环境**

在找工具的时候，会针对不同的桌面环境有不同的bug和配置方法。对Qt、GTK应用支持也不一样。

----

**DM Display Manager登陆管理器**

使用的是SDDM
```bash
sudo pacman -S sddm
```

然后systemctl启动服务就行了，非常方便

-----
