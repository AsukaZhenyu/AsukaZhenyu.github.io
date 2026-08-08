# zsh配置与使用
[toc]
<br/>

一般我们在TTY或者终端模拟器里使用的命令行（解释器）叫shell程序，对于现代Linux发行版用户一般情况下我们使用的shell程序是bash；现代macOS默认自带的是zsh； Windows不是类Unix操作系统， Windows默认的shell之一是自行开发的PowerShell， 它自带面向对象的许多特征， 功能非常强大； 鸿蒙OS默认不为普通用户提供命令行终端应用，需要自己安装。

对于Linux用户，很多人都不推荐直接使用bash，因为缺乏一些开箱即用的现代化交互特性，例如：语法高亮、自动建议与拼写纠正等。有人推荐fish，也有人推荐zsh。fish 开箱即用体验优秀，但与bash脚本不兼容；而zsh既兼容bash，又拥有强大的可定制性和插件生态。我是用了一段时间的bash，现在想要迁移到zsh上，本文就是记录迁移的过程。


使用下面的命令看自己是否安装了zsh：
```bash
zsh --version
```

使用下面的命令将zsh设置为默认shell：
```bash
chsh -s $(which zsh)
```

安装oh-my-zsh:
```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

安装完了后就可以直接把`~/.bashrc`里面自定义的设置直接复制到`~/.zshrc`里。

---

复制时出现了问题，明明在nvim配置里启用了系统剪切板，但是用的时候发现没有生效。

原因是：系统还没安装剪切板，我使用niri窗口管理器，安装了面向Wayland的剪切板`wl-clipboard`。

你也可以在nvim里运行命令`:checkhealth`查找剪切板相关信息，来查看到底是哪里出了问题。

---

目前来看，zsh的配置文件里可以配置zsh的主题，以及zsh采用的插件，你可以通过下面的命令查看zsh原生支持哪些插件：
```zsh
omz plugin list
```

目前我只启用了两个插件：

- `git`：命令补全、分支显示

- `sudo`：按两次ESC键就可以在命令前加上sudo

然后还安装了一个自动补全的插件[zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions/blob/master/INSTALL.md)，可以向Fish那样，根据你此前的命令，给出自动补全。

安装也非常简单，输入下面的命令克隆仓库：
```zsh
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```
它会自动克隆到oh-my-zsh的插件文件夹下，然后在`~/.zshrc`里面的插件部分加上这个名字就可以了。

zsh-autosuggestion并不是按Tab进行补全，按→接受全部建议，ctrl+→接受下一个单词。
