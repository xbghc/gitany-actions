---
title: CLI 工具
---

# @gitany/cli（命令行）

包路径：`packages/cli`，可执行名：`gitcode`

说明：本 CLI 的命令与使用方式参考 GitHub CLI（`gh`），是其在 GitCode 平台上的等价实现与封装。例如：

- `gh pr list` → `gitcode pr list`
- 统一采用子命令与选项的风格（如 `--state`、`--page` 等）。

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

### gitcode pr list &lt;git-url&gt;

列出指定仓库的 Pull Requests。默认状态为 `open`，默认输出为「标题列表」：

```
- [#18] 修复登录异常
- [#16] CI: 提升缓存命中率
```

```bash
gitcode pr list https://gitcode.com/owner/repo.git

# 带筛选参数：
gitcode pr list --url git@gitcode.com:owner/repo.git \
  --state open --base main

# 输出 JSON：
gitcode pr list <url> --json
```

- 选项：
  - `--url <git-url>`：仓库地址（可替代位置参数）
  - `--state <state>`：`open | closed | all`（默认 `open`）
  - `--head <ref>`：按源分支或 `repo:branch` 过滤
  - `--base <branch>`：按目标分支过滤
  - `--sort <field>`、`--direction <asc|desc>`：可选排序
  - `--json`：输出原始 JSON 数组
- 调用：`GET /api/v5/repos/{owner}/{repo}/pulls`

### gitcode pr create &lt;git-url&gt;

创建 Pull Request（仅支持部分字段）。

```bash
gitcode pr create https://gitcode.com/owner/repo.git \
  --title "修复登录异常" --head feat/login-fix --base main --body "补充说明：修复 Token 过期报错"

# 关联 Issue（示例）：
gitcode pr create <url> --title "修复登录异常" --head feat/login-fix --base main --issue 123
```

- 选项：
  - `--url <git-url>`：仓库地址（可替代位置参数）
  - `--title <title>`：PR 标题（必填）
  - `--head <branch>`：源分支名称（不支持跨仓库，必填）
  - `--base <branch>`：目标分支（可选）
  - `--body <text>`：PR 描述内容（可选）
  - `--issue <n>`：将 PR 关联到指定 Issue（可选）
  - `--json`：输出创建结果的原始 JSON
- 字段支持（与 GitCode 文档对齐的子集）：`title`、`head`、`base`、`body`、`issue`
- 调用：`POST /api/v5/repos/{owner}/{repo}/pulls`

## 环境变量

- `GITCODE_TOKEN`：令牌（高优先级覆盖本地存储）
- `GITCODE_WHOAMI_PATH`：鉴权验证路径（默认 `/user`）

## 本地存储路径

CLI 将认证信息保存到：`~/.gitany/gitcode/config.json`
