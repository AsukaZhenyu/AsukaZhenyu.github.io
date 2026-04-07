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

（原本nmcli的连接笔记）

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

---

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

由于连接校园网需要断开代理，所以需要简单轻便的开关mihomo的方法，将下面的内容放入~/.zshrc：

```bash
alias m-on='sudo systemctl start mihomo && echo "Mihomo 已启动"'
alias m-off='sudo systemctl stop mihomo && echo "Mihomo 已停止"'
alias m-st='systemctl status mihomo'
alias m-up='~/bin/update_mihomo.sh'
```

这里因为每次需要从代理网站下载配置文件后要复制到对应的地方也非常麻法，所以写了一个脚本，在Downloads文件夹下根据时间戳找到最新的配置文件然后复制到对应的地方，可以快捷地完成代理配置：

```bash
#!/bin/bash

src="$HOME/Downloads"
dest="/etc/mihomo/config.yaml"

# 获取所有匹配的文件列表
files=("$src"/config-*.yaml)
if [ ! -e "${files[0]}" ]; then
    echo "未找到 config-*.yaml 文件"
    exit 1
fi

# 找出文件名中时间戳最大的文件
latest=""
max_ts=0
for f in "${files[@]}"; do
    base=$(basename "$f")
    if [[ $base =~ ^config-([0-9]{14})\.yaml$ ]]; then
        ts=${BASH_REMATCH[1]}
        if (( ts > max_ts )); then
            max_ts=$ts
            latest="$f"
        fi
    fi
done

if [ -z "$latest" ]; then
    echo "没有符合 config-YYYYMMDDHHMMSS.yaml 格式的文件"
    exit 1
fi

# 复制到目标位置（覆盖已存在的文件）
sudo cp "$latest" "$dest"
echo "已用 $latest 更新 $dest"
```

----

**桌面环境DE**

接下来配置 桌面环境（ Desktop Environment， DE），
GNOME 和 KDE这些是集成好了的DE， 就什么都有可以开箱即用。

arch刚安装完，我们面对的是系统第一个虚拟控制台tty1，tty是由linux内核提供的虚拟控制台/虚拟终端，tty是电传打字机Teletypewriter的缩写。真实终端指的是物理显示屏和键盘。这个词非常有年代感，想象很久以前一个电脑有一个房间那么大，你通过一个长长的线连接着的电传打字机与计算机交互。我做为笔电男大，眼前的屏幕和键盘就是一切，挺难体会什么叫tty什么叫终端（Terminal）。大大的计算机连出来一块小小的屏幕，这一小块屏幕就是终端、末端，你可以与之交互。

shell是运行在TTY或者终端模拟器上的程序，常见的有bash、zsh、fish
shell运行在TTY之上的命令行，你可以输入类似自然语言的预设命令，就可以调用系统完成某些任务。TTY是Linux最底层的文本输入输出，shell是进程运行在TTY和模拟终端中的命令解释工具。

当进入图形界面后就不能直接使用TTY了，必须安装终端模拟器在图形界面里使用命令行（当然也可以退出图形界面使用TTY）

先安装图形工具是对的，据我所知，只有滚挂的时候才会进入TTY修复，在图形界面下再运行模拟终端，由图形合成器提供的终端在字体、背景等观感上更美观。之后有什么工具、插件想要安装使用，还是在图形工具下的模拟终端里安装比较好。在阅读相关文档时也会看到在TTY和模拟终端之间有所不同。

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

我不打算安装gnome的中控，也不打算使用其自带的文件管理系统，我计划安装TUI文件管理器Yazi，这玩意的好处是在tty也能用，在修系统的时候非常方便。
```bash
sudo pacman -S niri xwayland-satellite kitty fuzzel mako libnotify \
polkit-gnome xdg-desktop-portal xdg-desktop-portal-gtk xdg-desktop-portal-wlr
```

通过niri-session打开niri会话，会生成默认配置文件
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

---

**剪切板**

没想到Arch Linux连系统剪切板都没有，想要复制的内容在不同软件直接粘贴，需要有一个系统剪切板来存。这里安装的是`wl-clipboard`。

---

**截屏与录屏**

这里就弄截屏，之后又需要的时候再弄录屏吧，截屏需要一定的易用性，截完屏后存储在一个固定的地方，然后放到系统剪切板中，并弹出通知提示截屏完成。

需要两个包作为截屏基础：`grim`截屏工具、 `slurp`交互式选择区域。还需要一个包`jq`用于解析json数据，用于提取json文本中的数据，用于窗口截图。

```bash
sudo pacman -S grim slurp jq
```

在`~/.config/niri/config.kdl`里写入，注意要在大括号bind内：
```kdl

    Mod+S{ 
      // screenshot; 
      // spawn "notify-send" "Print works";
      // spawn "ehco 'strat screenshot'"
      spawn "/home/yanagi/bin/niri-screenshot" "full";
    }
    Ctrl+S{ 
      // screenshot-screen; 
      spawn "/home/yanagi/bin/niri-screenshot" "area";
    }
    Alt+S{ 
      // screenshot-window; 
      spawn "/home/yanagi/bin/niri-screenshot" "window";
    }

```
注意niri配置文件的spawn的解法，一行命令有多个参数要分开引号来写，最后要加上分号，否则不会执行。

这里本来想window截图模式是选择窗口截图，但是不太好实现，niri msg没有给出聚焦窗口的坐标宽高信息，所以行为可能不理想，实现脚本如下所示：
```bash
#!/usr/bin/env bash

set -euo pipefail

SCREENSHOT_DIR="${HOME}/Pictures/Screenshots"
mkdir -p "$SCREENSHOT_DIR"

FILENAME="screenshot-$(date +%Y%m%d-%H%M%S).png"
FILEPATH="${SCREENSHOT_DIR}/${FILENAME}"

case "$1" in
    full)
        grim "$FILEPATH"
        ;;
    area)
        grim -g "$(slurp)" "$FILEPATH"
        ;;
    window)
        # 使用 slurp -o 选择窗口（交互式）
        GEOM=$(slurp -o)
        grim -g "$GEOM" "$FILEPATH"
        ;;
    *)
        echo "Usage: $0 {full|area|window}"
        exit 1
        ;;
esac

wl-copy < "$FILEPATH"

if command -v notify-send >/dev/null; then
    notify-send "截图已保存" \
        "📸 ${FILENAME}\n文件已保存至 ${SCREENSHOT_DIR}\n并已复制到剪贴板" \
        -i "$FILEPATH" \
        -t 3000
fi

echo "$FILEPATH"
```
win+s -> 全屏截图

ctrl+s -> 自选截图，自己画截图框

alt+s -> 点击窗口截图，但是效果不理想，点击窗口还是截的全屏，但是也可以通过画框选定截图范围，我觉得可以视为上面两者的结合。

---

**Picgo**

我的笔记一般把图片上传到github图床，然后在markdown引用链接，在picgo对应的github仓库给了安装说明：
```bash
paru -S picgo-appimage
```
然后直接可以通过fuzzel打开，打开之后就是一个方型的小窗口，右键可以快速通过剪切板上传，或者打开picgo全屏进行配置。

---

**蓝牙**

目前不打算用蓝牙了，打算买一个有线耳机，主要是懒得充电，也懒得配置。

---

**壁纸**

使用swww和waypaper，swww是后端，waypaper是换壁纸的前端。
```bash
paru -S swww waypaper
```
要在niri里配置：
```bash
spawn-at-startup "swww-daemon"
```

目前swww好像用不了了，好像是因为项目改名为awww了,`sudo pacman -Syu`后就用不了了，现在也懒得管，反正不影响使用。

---

**steam**

首先要在`/etc/pacman.conf`中启用多位库，也就是将下面两行取消测试：
```
[multilib]
Include = /etc/pacman.d/mirrorlist
```
在配置`/etc/pacman.conf`的时候，对于不同的库，不同的源解去注释的时候，也要把上面的[]内的内容解注释掉，否则你的pacman还是找不到。

这里查阅资料后发现，wayland对nvidia驱动支持比较差，而且我的硬件比较老，nvidia的支持比较差。

这里安装i3-wm，一个基于X11的窗口管理器，对nvidia驱动支持比较好。

安装i3-wm不必删掉niri,到时候在SDDM登陆界面可以选择进入哪个窗口管理器，可以自由选择进入niri还是i3,他们一个是基于wayland一个是基于X11，不会相互冲突。

在配置游戏的过程中，我们必须要自己管理显卡使用。

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

在调试SDDM相关的时候，很有可能会遇到图形相关的错误，导致开机时卡在inital ramdisk步骤，解决办法是在grub启动时，按e进入编辑界面，在linux开头的那一行后面加上空格和3，然后按Ctrl+X启动进入tty修复，在调试过程中建议关掉sddm的系统服务，防止调试时需要重启需要反复执行上述步骤。

-----
