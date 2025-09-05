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
  - 选项：
    - `--token <token>` 令牌（或将通过交互输入）
    - `--base <api-base>` API 基址，默认 `https://gitcode.com/api/v5`
    - `--style <style>` 认证风格：`query|bearer|token|header`（默认 `query`）
    - `--header <name>` 当 `--style header` 时自定义请求头名
  - 行为：保存令牌到本地配置并尝试 `GET /user` 验证。

- `status`
  - 显示本地是否存在令牌，并尝试调用 `/user` 判断是否有效。

- `logout`
  - 清除本地保存的令牌。

- `oauth-exchange`
  - 通过授权码换取 Token 并保存：
    - `--code &lt;code&gt;`
    - `--client-id &lt;id&gt;`
    - `--client-secret &lt;secret&gt;`
    - `--base &lt;api-base&gt;`（可选）
  - 请求：`POST /oauth/token`，表单参数 `grant_type=authorization_code`。

## 环境变量

- `GITCODE_API_BASE`：API 基址（默认 `https://gitcode.com/api/v5`）
- `GITCODE_TOKEN`：令牌（高优先级覆盖本地存储）
- `GITCODE_AUTH_STYLE`：`query|bearer|token|header`
- `GITCODE_AUTH_HEADER`：自定义请求头名（当 `header` 风格时）
- `GITCODE_WHOAMI_PATH`：鉴权验证路径（默认 `/user`）
