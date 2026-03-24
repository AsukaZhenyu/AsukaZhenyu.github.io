# neovim的配置与使用

[toc]
<br/>

vi是最早的全屏文本编辑器之一，vim是vi的提升版本，neovim又是vim的提升版本。neovim对于vim好的一点是支持lua脚本对neovim进行配置，实现了更高的可扩展性和模块化.我们可以模块化管理neovim的配置，而不是在动辄上千行的.vimrc上屎上雕花，并且通过lua脚本语言管理neovim的插件，使插件安装更简单，还能实现异步加载，大大提升了启动速度。并且neovim 原生支持异步（RPC），这意味着插件可以在后台运行（比如语法检查、自动补全），而不会卡住你的打字界面。

## 基础操作和vim一样

- 保存并重新载入`:so`

我在wsl2上安装了vim，直接输入vimtutor就会加载出来一个交互式教程：
![](https://cdn.jsdelivr.net/gh/AsukaZhenyu/blog-img-store@main/img/202603101440764.png)
不想看英语可以对着[这个](https://github.com/HanielF/VimTutor)项目一边看一边做。但是该项目的一些字符好像没正常显示。

---

- `x`删除_光标下的字符（或者|光标后的字符）
- `A`在一行的后面进入插入模式

---

- `dw`删除光标及之后到下个单词开头
- `de`删除光标及之后到本单词结尾
- `d$`删除光标及以后的改行所有内容（d是配合下面的动作motion使用的）
- `w`光标移动到下一个单词的开头（可以加数字`2w`）
- `e`光标移动到本单词的结尾（可以加数字`3e`）
- `0`光标移动到行开头
- `$`光标移动到行结束
- `dd`删除本行（`xdd`删除本行及下面x-1行）

d删除的内容默认会存在**未命名寄存器""**

---

- `u`撤回上一步操作undo
- `U`恢复一整行，把一整行退回到原始状态
- `ctrl+R`注意是大写R，撤回撤回

---

- `p`把vim寄存器的内容粘贴到光标的**下一行**
- `rx`先输入`r`然后输入字符，把光标的字符替换为你接下来输入的字符
- `c`变换change操作码，本质上是`d`操作码加`i`操作码。`ce`删除光标及本单词剩余部分，并进入插入模式（修改）。

---

- `ctrl+g`可以在底部小字出显示当前光标的行号
- `G`移动到文件底部
- `gg`移动到文件顶部
- `num+G`跳转到num行
- `/search`按下n后光标跳转到下一个词，按下N后跳转到上一个词（此时底部会从/换为?），N的本质是反转查找方向，看底部是`/`还是`?`明确方向，然后按n跳转下一个。
- `%`把光标放到`[{(`上然后按下`%`，光标会跳转到配对的括号上。
- `:s/old/new`在一行进入命令模式注意`:`，会把改行的第一个old改为new，如果要在行内全部替换可以改为`:s/old/new/g`，`:#,#s/old/new/g`在行号间进行替换，举个例子：`:2,4s/apple/orange/g`，要在全文的范围内进行替换，`:%s/old/new/g`，`:%s/old/new/gc`每次替换前进行确认

---

- `:!`以执行外部shell命令
- `:w filename`将本文内容保存到filename中，可以在命令后加`!`可以强制覆写
- 在视觉模式下选择若干行，然后执行上面的命令可以将选择的行写入文件
- `:r filename`插入文件内容，也可以插入shell执行结果，例如：`:r !ls -la`

---

- `o`在光标下插入一行，并进入插入模式；`O`在光标前插入一行，并进入插入模式
- `e`在单词间跳转，`a`直接在单词后插入。（`i`可能不太行，在光标前插入）
- `w`在单词间跳转，直接在单词第一个输入`R`进行单词替换，按ESC退出替换模式
- 视觉模式下移动光标选择文本，然后按`y`复制，然后按`p`粘贴，`yw`复制光标及之后的本单词部分，`yy`复制本行。
- `p`在光标之后粘贴和`P`在光标之前粘贴，`yy`或`dd`会自动新建行然后粘贴，否则不会。

---

之后的关于配置选项、对vim编程脚本的内容就不写了，这些进阶内容就直接在neovim里配置了。

## neovim配置

在~/.bashrc里将vi和vim设置为nvim的别名（alias），每次进入编辑器都要输入nvim很麻烦，但是输入vi很快。
```bash
alias vi="nvim"
alias vim="nvim"
```

neovim配置[视频](https://www.bilibili.com/video/BV1Td4y1578E)，配置项目文件结构：
```bash
~/.config/nvim
├── init.lua
└── lua
    ├── core
    │   ├── options.lua
    │   └── keymaps/lua
    └── plugins
        └── plugins-setup.lua

```


在init.lua里就是启用各文件的配置。
```lua
require("core.options")
```
### options.lua

基础的选项：

- 设置了行号与相对行号
- 缩进为2
- 防止包裹
- 设置光标行显示
- 启用鼠标
- 启用系统复制粘贴板
- 新的分割窗口默认为右和下
- 搜索不区分大小写+智能搜索
- 开启终端真颜色

### keymaps.lua

改键：

- 设置主键为空格
主键，或者leader键，作用是为自己设置的快捷键设置一个独立的命名空间，防止与vim默认的快捷键冲突

- ESC改为在插入模式快速输入jk

- 视觉模式下（v进入，输入jk可以选择若干行），然后输入JK（shift+jk）移动这些行。

- 主键+sv：水平增加窗口；主键+sh：垂直增加窗口

- 主键+nh：取消搜索高亮

### 插件
因为上面的视频使用的插件管理工具（packer）已经不再维护，所以我改用[lazy.nvim](https://github.com/folke/lazy.nvim)

`lazy.nvim`不是`lazyvim`。前者是neovim的插件管理器，我们可以自己从头开始写维护插件的lua代码，后面是一个基于neovim和lazy.nvim的一个开箱即用的编辑器配置。

首先看它的前置要求，检查一下有没有没安装的包，例如我发现我没有安装`luarocks`，防止后面出问题浪费调试时间。

可以直接按照`lazy.nvim`的[网站](https://lazy.folke.io/installation)给的模块化安装方法，一开始我想把bootstrap代码放到plugins文件夹下，和其他的插件配置文件放在一起，但是总是输入nvim后界面加载不出来，后面还是安装网站上的文件组织方法，把bootstrap代码放到config文件夹下，之后就好了。（也许是其他地方没有配置好,还有plugins文件夹如果是空的，进入nvim可能会有提示，但是不影响使用）

如果要添加插件，就在plugins文件夹下新建文件，返回一个lua字典，这个字典可能需要你查看插件项目的README.md来查看，配置文件形如：
```lua
return{
    "nvim-treesitter/nvim-treesitter",
    opts = {}
}
```

#### 状态条与buffer条
状态条可以美化neovim下面的状态栏，buffer栏在上面，可以显示打开的文件名，并且可用鼠标操控。

状态条lualine,将下面的内容写入nvim-lualine.lua文件里：
```lua
return{
  'nvim-lualine/lualine.nvim',
  dependencies = { 'nvim-tree/nvim-web-devicons' },
  opts = {}
}
```

buffer栏，将下面的内容写入bufferline.lua文件里：
```lua
return{
  {
    'akinsho/bufferline.nvim', 
    version = "*", 
    dependencies = 'nvim-tree/nvim-web-devicons',
    opts = {}
  }
}
```
之后用nvim随便打开一个文件，就会看到Lazy界面在下载对应的插件，然后就会生效。

#### 语法高亮

这里计划安装插件treesitter，它依赖一个包：`tree-sitter-cli`并且要求版本在0.26.1以上，直接用pacman或者paru安装不能满足版本要求。[tree-sitter-cli项目](https://github.com/tree-sitter/tree-sitter/blob/master/crates/cli/README.md)推荐使用cargo安装：

```zsh
cargo install --locked tree-sitter-cli
```

安装完以后根据提示要将对应的`~/.cargo/bin`放到PATH中去，保证OS可以找到对应的二进制文件。

接着把下面的内容放到plugins/treesitter.lua里（下面的是我根据treesitter的README.md自己弄的配置文件，不一定是最合理的，我查到的资料要么太老基于packer.nvim或者LLM自动生成的一些不存在的API，至少下面的做法可以实现高亮）：
```lua
return {
'nvim-treesitter/nvim-treesitter',
lazy = false,
build = ':TSUpdate',
config = function()
  require('nvim-treesitter').setup {
    -- Directory to install parsers and queries to (prepended to `runtimepath` to have priority)
    install_dir = vim.fn.stdpath('data') .. '/site'
  }
  require('nvim-treesitter').install { 'markdown', 'rust', 'javascript', 'zig', 'c', 'cpp', 'cuda' }
end,
}
```
然后把下面的内容放到core/options.lua里：
```lua
-- treesitter highlight
vim.api.nvim_create_autocmd('FileType', {
  pattern = { 'markdown','c','cpp','cuda' },
  callback = function() vim.treesitter.start() end,
})
```

#### 主题颜色

上面的高亮设置完后，虽然有但是效果不太好，我们可以换一个主题颜色，换完以后颜色看起来多样一些，这里安装tokyonight主题。

直接复制lazy.nvim的[实例](https://lazy.folke.io/spec/examples)上面的关于tokyonight的配置，写到tokyonight.lua文件里：
```lua
return{
  "folke/tokyonight.nvim",
  lazy = false, -- make sure we load this during startup if it is your main colorscheme
  priority = 1000, -- make sure to load this before all the other start plugins
  config = function()
    -- load the colorscheme here
    vim.cmd([[colorscheme tokyonight]])
  end,
}
```

#### 文件树

虽然我安装了Yazi,一个TUI文件管理器，而且Yazi使用习惯和vim非常相像，而且还有yazi.nvim插件，但是我还是想要一个开箱即用的，类似VS Code的文件侧边栏。（不太喜欢yazi.nvim浮动窗口的设计）

计划安装[nvim-tree](https://github.com/nvim-tree/nvim-tree.lua),根据项目README.md,这里的配置比较复杂，先把下面的内容写入plugins/nvim-tree.lua:

```lua
return{
  "nvim-tree/nvim-tree.lua",
  version = "*",
  lazy = false,              -- 让它在启动时加载
  dependencies = {
    "nvim-tree/nvim-web-devicons", -- 文件图标
  },
  config = function()
    require("nvim-tree").setup({
      -- 常用配置
      sort_by = "case_sensitive",
      view = {
        width = 30,
        side = "left",
      },
      renderer = {
        group_empty = true,
      },
      filters = {
        dotfiles = true,
      },
      git = {
        enable = true,
      }
    })
 
    -- 快捷键
    -- 在core文件夹里一起设置了，因为要diable netrw
  end,
}
```

在core文件夹下创建nvim-tree-options.lua文件，并且在init.lua里最开头引用这个lua文件，这是因为使用nvim-tree最好在最开头disable netrw,在文件写入下面的内容：

```lua
-- disable netrw at the very start of your init.lua
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- optionally enable 24-bit colour
vim.opt.termguicolors = true
```

继续在core/keymaps.lua文件夹添加下面的内容：
```lua
-- nvim-tree 快捷键
keymap.set('n', '<leader>e', ':NvimTreeToggle<CR>', { desc = 'Toggle file tree' })

keymap.set('n', '<leader>f', ':NvimTreeFindFile<CR>', { desc = 'Reveal current file in tree' })
```

不要在nvim-tree-options.lua里添加改键内容，因为lua引入文件顺序会影响，在最开头的时候还没有定义主键为空格。

#### neovim内置终端

首先neovim本身支持终端模式，如果你不想安装插件，可以按照下面的思路设置快捷键：

先设置分屏，键入命令`:terminal`，然后进入插入模式，就可以正常输入命令了。

在分屏之间移动：`<C-w>hjkl`，也就是ctrl+w然后按下方向键。

这里使用toggleterm来管理终端，它可以持久化管理多个终端，把下面的内容写入plugins/toggleterm.lua:

```lua
return{
  -- amongst your other plugins
  'akinsho/toggleterm.nvim', 
  version = "*", 
  config = function()
    require("toggleterm").setup({
        size = 80,
        open_mapping = [[<c-\>]],
        hide_numbers = false,
        autochdir = true,
        shade_terminals = true,
        start_in_insert = true,
        insert_mappings = true, -- whether or not the open mapping applies in insert mode
        terminal_mappings = true, -- whether or not the open mapping applies in the opened terminals
        persist_size = true,
        persist_mode = true, -- if set to true (default) the previous terminal mode will be remembered
        direction = 'horizontal' ,
        close_on_exit = true,
        auto_scroll = true,
        shell = zsh,
    })
  end,
}

```

先按数字(1~9)，再按ctrl+\就会进入不同的终端，每个终端都会持久保留此前的记忆。
在终端模式，要按ctrl+\再按ctrl+n进入普通模式，在普通模式按i或者a进入终端模式。

但是在toggleterm下按ctrl+\会直接关掉终端，可以通过鼠标选中直接进入视觉模式。

所以肯定是要改键的，在窗口间移动比较麻烦，在终端选择文字然后复制也是常用需求。

在core/keymaps.lua里添加下面的代码：

```lua
-- 窗口间快捷移动,我默认只在右边开一个终端，在左右来回移动
keymap.set('t', '<leader>h', '<C-\\><C-n><C-w>h')
keymap.set('n', '<leader>l', '<C-w>l')
keymap.set('n', '<leader>h', '<C-w>h')

-- 终端模式推出快捷键 not term
keymap.set('t', '<leader>nt', '<C-\\><C-n>', { noremap = true })
```

这也可以在上面配置的文件树中使用，非常方便。 

#### Markdown预览器
这对我来说是最重要的一个功能了，我选择markdown-preview,一个基于浏览器的预览器，其他的在编辑器内的预览器我感觉效果不好。

先安装node.js、npm、yarn,然后根据[项目](https://github.com/iamcco/markdown-preview.nvim)的说明，将下面内容写入plugins/markdown-preview.lua文件：

```lua
return{
  "iamcco/markdown-preview.nvim",
  cmd = { "MarkdownPreviewToggle", "MarkdownPreview", "MarkdownPreviewStop" },
  build = "cd app && yarn install",
  init = function()
    vim.g.mkdp_filetypes = { "markdown" }
  end,
  ft = { "markdown" },
}
```

注意它是懒加载的，只有遇到.md文件才会加载。

输入:MarkdownPreview即可打开浏览器预览，如果没有打开浏览器，可以执行下面的步骤：

```bash
cd ~/.local/share/nvim/lazy/markdown-preview.nvim
yarn install
```

如果没报错，那应该就可以正常使用了。
