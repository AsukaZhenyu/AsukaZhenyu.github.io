# 在退役老电脑上安装ArchLinux

[文档](https://wiki.archlinux.org/title/Installation_guide)，[视频](https://www.bilibili.com/video/BV11J411a7Tp/)

我要在一台2017年11月生产的ThinkPad E470c上安装Arch Linux，这台电脑目前（2026.2.2）在转转上二手的大概是700-800人民币，现在win10也跑不动了，想要安装Arch Linux，顺便熟悉一下操作系统与Linux相关的知识。

电脑配置：
cpu：Intel core i5-6200U 2.30GHz
内存：8G 硬盘：512G
显卡：Intel(R) HD Graphics 520
     NVIDIA GeForce 920MX


现在官网上下载Arch Linux的iso文件，然后使用Rufus制作系统安装盘：

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202602021257028.png)

- 关于持久分区：
在U盘上运行系统，进行修改例如设置字体、键盘、网络，是否会保存。这个就不弄了，不在U盘上弄。

- MBR与GPT
MBR和GPT是两种不同的磁盘分区方案，它们决定了硬盘如何被初始化、分区以及系统如何从硬盘启动。
MBR主引导记录，推出时间更早，对于硬盘容量、分区数量有限制，且安全性、鲁棒性以及性能较差。

- BIOS与UEFI
之前看北航计算机学院面经，有问到计算机开机的过程。BIOS是主板上的固件，上电后先运行BIOS，先进行硬件自检，然后根据设定系统盘顺序，读取MBR加载引导代码，再加载硬盘活动分区的VBR，然后加载操作系统。
UEFI是BIOS的现代上位替代，上电后初始化硬件，然后加载EFI系统分区（ESP），从ESP中加载引导程序，由引导程序加载操作系统。

对于2010年后生产的笔记本，装的win8以上的笔记本基本上支持GPT/UEFI，所以在制作系统安装盘的时候，选择GPT/UEFI(非CSM)选项

这里的文件系统指的是U盘，也就是系统安装盘的文件系统，与后续电脑上的文件系统无关，UEFI要求安装盘上的文件格式是FAT32

搜索高级启动，然后点击重新启动，选择UEFI固件设置，关闭安全启动，保存并重启

重启时按F12进入BIOS，选择USB HDD：SanDisk Ultra，回车

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202602041438247.jpg)

直接选择第一项Arch Linux install medium，进入安装环境，这是我们是root用户，进入了虚拟终端，使用Zsh

安装盘已经预安装好了很多工具，包括vim，wpa_suplicant，zsh等，我们在这个安装盘上进行联网、分区，然后运行脚本把镜像安装到电脑硬盘上。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202602041440787.jpg)

不改变键盘布局，使用默认的

设置字体：setfont ter-132b 最大的字体

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202602041444044.jpg)

确认启动格式：cat /sys/firmware/efi/fw_platform_size
输出64，对应64-bit x64 UEFI

连接互联网，使用ip link查看互联网设备

打开互联网设备：ip link set wlan0 up

扫描可以使用的WIFI：iwlist wlan0 scan | grep ESSID

生成网络配置文件：
wpa_passphrase TP-LINK_481A password > internet.conf

-----

视频里的方法：

连接互联网：
wpa_supplicant -c internet.conf -i wlan0 &

动态分配一个IP地址（这是Arch安装盘里自带的工具）：dhcpcd & 

配置失败了

Gemini推荐使用iwctl，但是也失败了，还是老老实实看Wiki吧

wiki要求我确认网卡没有被rfkill阻塞，使用：rfkill list命令查看阻塞情况

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202602041445075.jpg)

无线广域网软件硬件都没有被阻塞

我知道为什么错了，md，WIFI名字写错了

wpa还是不太稳定，还是先用iwctl先连上
iwctl
station wlan0 scan
station wlan0 get-networks
station wlan0 connect "TP-LINK_481A"
password
quit

dhcpcd wlan0
ping -c 4 baidu.com

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202602041446027.jpg)

这里可以看到联网成功了。

-----

接下来确认时间是对的，更正系统时间
timedatectl set-ntp true

开始分区
先查看当前电脑有哪些硬盘：fdisk -l
有一个硬盘：/dev/sda 465.76GiB 目前已经有三个分区
还有一个：/dev/sdb是目前插在电脑上的安装盘

fdisk /dev/sda 进入fdisk命令行

这里要看wiki，视频比较古早了，建议分区大小有所变化
g 新建分区列表
n 创建第一个分区 1G 存引导程序
n 创建第三个分区 虚拟内存分区 SWAP 16G
n 创建第二个分区 剩余内容
p 确认
w 写入

根据wiki上的建议，efi文件夹大小建议1G，SWAP文件夹至少4G，建议内存1-2倍。
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202602041448884.jpg)

制作引导系统文件efi格式，格式化分区1
mkfs.fat -F32 /dev/sda1
主分区文件系统我选择btrfs，主要是未来防止日后滚挂，想要快照一件恢复功能
mkfs.btrfs -L ARCH /dev/sda2
制作swap
mkswap /dev/sda3
打开swap
swapon /dev/sda3

编辑pacman配置文件
vim /etc/pacman.conf
进入/etc/pacman.d/mirrorlist
把中国源放在最顶上

接下来把电脑硬盘挂载到当前安装环境下

mount /dev/sda2 /mnt
btrfs subvolume create /mnt/@
btrfs subvolume create /mnt/@home

umount /mnt

mount -o compress=zstd,subvol=@ /dev/sda2 /mnt
mkdir -p /mnt/{home,boot}
mount -o compress=zstd,subvol=@home /dev/sda2 /mnt/home
mount /dev/sda1 /mnt/boot

lsblk查看挂载情况

开始安装：
pacstrap -K /mnt base linux liunx-firmware btrfs-progs networkmanager vi sudo

pacstrap脚本因为找不到/etc/initramfs-linux.conf文件，中断了执行，并提出警告，系统镜像可能不完整。这里我先继续安装，实在不行再重新安装系统吧。（需要先运行下面的生成本地locale文件，然后运行mkinitcpio -P，重新生成内核镜像，就可以运行成功了）

生成fstab，告诉系统重启后去哪里找btrfs子卷
genfstab -U /mnt >> /mnt/etc/fstab

arch-chroot /mnt 进入系统
设置时间：
ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
同步系统时间：
hwclock --systohc

exit暂时退出
vim /mnt/etc/locale.gen
找到en_US，去掉前面的注释
回到chroot执行locale-gen生成一些本地文件

重复编辑 /mnt/etc/locale.conf
LANG=en_US.UTF-8

/mnt/etc/hostname 写自己的用户名
lzy

/mnt/etc/hosts
加上一行：
127.0.0.1    lzy.localdomain lzy

安装系统引导grub：
pacman -S grub efibootmgr intel-ucode os-prober
mkdir boot/grub
grub-mkconfig > /boot/grub/grub.conf
uname -m
grub-install --target=x86_64-efi --efi-directory=/boot

pacman -S neovim zsh iwd dhcpcd

重启拔掉U盘，就可以进入Arch Liunx了

用户名输入：root
密码输入你之前设置的密码

使用networkmanager联网
systemctl start NetworkManager
systemctl enable NetworkManager

nmcli device wifi list
nmcli device wifi connect "TP-LINK_481A" password "password"

创建用户并加入wheel组
useradd -m -G wheel yanagi
passwd yanagi
EDITOR=vi visudo

这里会用vi打开visudo，简单的编辑和vim一样。
去掉注释
#%wheel ALL=(ALL:ALL)ALL

exit回到退出界面
输入用户名和密码登陆就OK了。

![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202602041450736.jpg)
