# @xbghc/gitcode-cli

GitCode 命令行工具 — 让仓库操作快人一步

## 30 秒上手

```bash
npm i -g @xbghc/gitcode-cli
gitcode auth set-token YOUR_TOKEN
gitcode pr list   # 就这么简单
```

> 需要 Node.js 22+。Token 获取：[GitCode 访问令牌](https://gitcode.com/profile/personal_access_tokens)

## 亮点功能

```bash
# 一键切到 PR 分支，本地 review
gitcode pr checkout 123

# 快速创建 Issue
gitcode issue create -t "Bug: 登录失败" -b "复现步骤..."

# 关闭/重开 Issue
gitcode issue close 42
gitcode issue reopen 42

# 创建 PR
gitcode pr create --title "新功能" --head feature-branch
```

**智能识别**：在 GitCode 仓库目录下执行命令，自动读取 remote 信息，无需手动传 URL。

## 认证管理

```bash
gitcode auth set-token <token>   # 保存令牌
gitcode auth status              # 查看状态
gitcode auth remove-token        # 删除令牌
```

令牌优先级：环境变量 `GITCODE_TOKEN` > 配置文件

## 更多命令

```bash
gitcode --help              # 查看所有命令
gitcode pr --help           # PR 相关命令
gitcode issue --help        # Issue 相关命令
gitcode repo --help         # 仓库相关命令
```

完整文档：[docs/gitcode-cli](../../docs/gitcode-cli/index.md)

## 从源码安装

```bash
git clone https://github.com/xbghc/gitcode-actions.git
cd gitcode-actions
pnpm install && pnpm build
cd packages/gitcode-cli && pnpm link --global
```

## License

MIT
