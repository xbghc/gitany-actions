---
title: CLI 工具
---

# @gitany/cli（命令行）

包路径：`packages/cli`，可执行名：`gitcode`

构建与运行：

```bash
pnpm build
pnpm --filter @gitany/cli start -- --help
```

> 开发模式：`pnpm --filter @gitany/cli dev`

## 命令

### gitcode parse &lt;git-url&gt;

解析 Git 远程地址并输出 JSON。

```bash
gitcode parse https://gitcode.com/owner/repo.git
```

### gitcode auth &lt;subcommand&gt;

子命令：`login | status | logout | oauth-exchange`

- `login`
  - 选项：`--token <token>`（或交互输入）
  - 行为：保存令牌并尝试 `GET /user` 验证。
- `status`
  - 显示是否已认证与 `/user` 校验结果。
- `logout`
  - 清除本地保存的令牌。
- `oauth-exchange`
  - 通过授权码换取 Token 并保存：
    - `--code <code>` `--client-id <id>` `--client-secret <secret>`
    - 可选：`--base <api-base>`

### gitcode permission &lt;git-url&gt;

查询当前登录用户在指定仓库（通过仓库链接）的权限。

```bash
gitcode permission https://gitcode.com/owner/repo.git

# 或使用参数：
gitcode permission --url git@gitcode.com:owner/repo.git
```

- 调用：`GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission`
- 输出：固定为一个词：`admin | write | read | none`（仓库不存在时返回 `none`）

## 环境变量

- `GITCODE_TOKEN`：令牌（高优先级覆盖本地存储）
- `GITCODE_WHOAMI_PATH`：鉴权验证路径（默认 `/user`）

## 本地存储路径

CLI 将认证信息保存到：`~/.gitany/gitcode/config.json`
