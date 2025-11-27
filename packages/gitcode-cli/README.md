# @xbghc/gitcode-cli

GitCode 命令行工具，提供与 GitCode 平台的交互式命令行界面。

## 前置要求

在安装 `gitcode-cli` 之前，请确保您的系统满足以下要求：

- **Node.js** >= 22.0.0
- **pnpm** >= 10.0.0（推荐 10.15.0）

### 安装 Node.js

推荐使用 [nvm](https://github.com/nvm-sh/nvm)（Node Version Manager）来安装和管理 Node.js 版本：

```bash
# 安装 nvm（Linux/macOS）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装 Node.js 22
nvm install 22
nvm use 22

# 验证安装
node -v  # 应该显示 v22.x.x
```

> **Windows 用户**：可以使用 [nvm-windows](https://github.com/coreybutler/nvm-windows) 或直接从 [Node.js 官网](https://nodejs.org/) 下载安装。

### 安装 pnpm

```bash
# 使用 npm 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm -v  # 应该显示 10.x.x 或更高版本
```

## 安装

### 方式一：从 npm 安装（推荐）

适合**最终用户**，直接使用 CLI 工具：

```bash
# 全局安装
pnpm add -g @xbghc/gitcode-cli

# 验证安装
gitcode --version
gitcode --help
```

### 方式二：从源码安装

适合**开发者**，需要修改或调试 CLI 源码：

```bash
# 克隆仓库
git clone https://github.com/xbghc/gitcode-actions.git
cd gitcode-actions

# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 链接 CLI 到全局（可选）
cd packages/gitcode-cli
pnpm link --global

# 测试运行
gitcode --help
```

### 验证安装

安装完成后，运行以下命令验证：

```bash
# 查看版本
gitcode --version

# 查看帮助信息
gitcode --help

# 检查认证状态（此时应显示未认证）
gitcode auth status
```

## 获取 GitCode Token

要使用 `gitcode` CLI，您需要一个 GitCode Personal Access Token：

1. 登录 [GitCode](https://gitcode.com/)
2. 进入 **个人设置** → **访问令牌**（或直接访问 https://gitcode.com/profile/personal_access_tokens）
3. 点击 **生成新令牌**
4. 设置令牌名称和权限范围：
   - **建议权限**：`api`（完整 API 访问）或根据需要选择 `read_repository`、`write_repository` 等
5. 点击 **创建令牌** 并复制生成的令牌（只会显示一次）
6. 保存令牌到 CLI：
   ```bash
   gitcode auth set-token YOUR_TOKEN_HERE
   ```

> **注意**：令牌就像密码一样重要，请妥善保管，不要分享或提交到代码仓库。

## 认证

首先需要配置认证：

```bash
# 通过环境变量（临时方式）
export GITCODE_TOKEN=your-token

# 或保存到配置文件（推荐）
gitcode auth set-token your-token

# 查看认证状态
gitcode auth status

# 删除已保存的 token
gitcode auth remove-token
```

Token 读取优先级：**环境变量 > 配置文件**

## 命令概览

### 认证命令

```bash
# 保存认证 token
gitcode auth set-token <token>

# 查看认证状态
gitcode auth status

# 删除已保存的 token
gitcode auth remove-token
```

### 用户命令

```bash
# 查看当前用户信息
gitcode user show

# 查看用户命名空间
gitcode user namespace
```

### 仓库命令

```bash
# 查看仓库权限
gitcode repo permission https://gitcode.com/owner/repo

# 查看仓库设置
gitcode repo info settings owner repo

# 查看仓库分支
gitcode repo info branches owner repo

# 查看仓库提交历史
gitcode repo info commits owner repo

# 查看仓库贡献者
gitcode repo info contributors owner repo

# 查看仓库 Webhooks
gitcode repo info webhooks owner repo
```

### Pull Request 命令

```bash
# 列出 PR
gitcode pr list https://gitcode.com/owner/repo
gitcode pr list https://gitcode.com/owner/repo --state closed
gitcode pr list https://gitcode.com/owner/repo --base main

# 创建 PR
gitcode pr create https://gitcode.com/owner/repo \
  --title "新功能" \
  --head feature-branch \
  --base main \
  --body "这是一个新功能的 PR"

# 查看 PR 设置
gitcode pr info settings owner repo
```

### Issue 命令

```bash
# 列出 Issue
gitcode issue list https://gitcode.com/owner/repo
gitcode issue list https://gitcode.com/owner/repo --state closed
# 查看 Issue 详情
gitcode issue view 42 https://gitcode.com/owner/repo
# 查看 Issue 及其评论
gitcode issue view 42 --repo owner/repo --comments
# 编辑 Issue
gitcode issue edit 42 --repo owner/repo --label bug --assignee dev
# 关闭 / 重新打开 Issue
gitcode issue close 42 --repo owner/repo
gitcode issue reopen 42 --repo owner/repo
```

### URL 解析

```bash
# 解析 Git URL
gitcode parse https://gitcode.com/owner/repo
```

## 详细用法

### 认证管理

```bash
# 设置 token（保存到配置文件）
$ gitcode auth set-token your_gitcode_token_here
Token saved successfully
Config file: /home/user/.gitcode/config.json

# 查看认证状态
$ gitcode auth status
Authenticated: your...here
Source: Config file (/home/user/.gitcode/config.json)

# 使用环境变量时的状态显示
$ GITCODE_TOKEN=env_token gitcode auth status
Authenticated: env_...oken
Source: Environment variable (GITCODE_TOKEN)

# 删除保存的 token
$ gitcode auth remove-token
Token removed successfully
```

### 用户信息

```bash
$ gitcode user show
用户信息:
  ID: 64e5ed8f7e20aa73efcbc302
  用户名: xxm
  邮箱: xiongjiamu@163.com
  个人主页: https://gitcode.com/gitcode-xxm
  简介: a PM
  关注者: 8
  关注中: 35
  主要语言: Python, Markdown, C++, C, HTML
```

### 仓库信息

```bash
$ gitcode repo info branches myorg myrepo
仓库分支:
  main (默认: 是, 受保护: 是)
  develop (默认: 否, 受保护: 否)
  feature/test (默认: 否, 受保护: 否)
```

```bash
$ gitcode repo info commits myorg myrepo
仓库提交历史:
  1. a1b2c3d - 修复登录问题
     作者: John Doe <john@example.com>
     时间: 2024-01-15T10:30:00Z

  2. e4f5g6h - 添加新功能
     作者: Jane Smith <jane@example.com>
     时间: 2024-01-14T15:45:00Z
```

### Pull Request 管理

```bash
# 创建 PR
$ gitcode pr create https://gitcode.com/myorg/myrepo \
  --title "添加用户认证功能" \
  --head feature/auth \
  --base main \
  --body "这个 PR 添加了用户登录和注册功能"

Created PR #123: 添加用户认证功能
```

### 输出格式

大部分命令支持 JSON 输出格式：

```bash
$ gitcode pr list https://gitcode.com/myorg/myrepo --json
[
  {
    "id": 123,
    "title": "添加用户认证功能",
    "state": "open",
    "user": {
      "login": "john",
      "avatar_url": "https://..."
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

## 配置

### 环境变量

- `GITCODE_TOKEN` - GitCode 认证令牌
- `GITCODE_API_BASE` - GitCode API 基础 URL（默认: https://gitcode.com/api/v5）
- `GITCODE_AUTH_STYLE` - 认证风格
- `GITCODE_AUTH_HEADER` - 认证头部

### 配置文件

配置文件存储在 `~/.config/gitcode/config.json`：

```json
{
  "token": "your-access-token",
  "authStyle": "bearer",
  "customAuthHeader": ""
}
```

**配置项说明：**

- `token`: GitCode 认证令牌（通过 `gitcode auth set-token` 设置）
- `authStyle`: 认证风格，可选值：`query`、`bearer`、`token`、`header`
- `customAuthHeader`: 自定义认证头部（可选）

**推荐使用 CLI 命令管理配置：**

- 使用 `gitcode auth set-token` 而不是手动编辑配置文件
- 配置文件会在首次保存 token 时自动创建

## 错误处理

命令行工具会提供清晰的错误信息：

```bash
$ gitcode user show
Error: 获取用户信息失败: Unauthorized
请检查您的认证令牌是否有效
```

## 开发

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-org/gitcode-actions.git
cd gitcode-actions

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行 CLI
node packages/gitcode-cli/dist/index.js --help
```

### 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
