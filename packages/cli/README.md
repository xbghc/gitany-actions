# @gitany/cli

GitCode 命令行工具，提供与 GitCode 平台的交互式命令行界面。

## 安装

```bash
pnpm add -g @gitany/cli
```

或使用项目本地安装：

```bash
pnpm add @gitany/cli
pnpm gitcode --help
```

## 认证

首先需要配置认证：

```bash
# 通过环境变量
export GITANY_TOKEN=your-token
export GITCODE_TOKEN=your-token

# 或使用认证命令
gitcode auth login
```

## 命令概览

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

# 查看 Issue 评论
gitcode issue comments https://gitcode.com/owner/repo 1
```

### URL 解析

```bash
# 解析 Git URL
gitcode parse https://gitcode.com/owner/repo
```

## 详细用法

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

- `GITANY_TOKEN` - GitAny 认证令牌
- `GITCODE_TOKEN` - GitCode 认证令牌
- `GITCODE_API_BASE` - GitCode API 基础 URL（默认: https://gitcode.com/api/v5）
- `GITCODE_AUTH_STYLE` - 认证风格
- `GITCODE_AUTH_HEADER` - 认证头部

### 配置文件

配置文件存储在 `~/.gitany/gitcode/config.json`：

```json
{
  "token": "your-access-token",
  "apiBase": "https://gitcode.com/api/v5"
}
```

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
git clone https://github.com/your-org/gitany-actions.git
cd gitany-actions

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行 CLI
node packages/cli/dist/index.js --help
```

### 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT