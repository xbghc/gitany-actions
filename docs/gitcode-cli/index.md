---
title: CLI 工具
---

# @xbghc/gitcode-cli（命令行）

包路径：`packages/gitcode-cli`，可执行名：`gitcode`

说明：本 CLI 的命令与使用方式参考 GitHub CLI（`gh`），是其在 GitCode 平台上的等价实现与封装。例如：

- `gh pr list` → `gitcode pr list`
- 统一采用子命令与选项的风格（如 `--state`、`--page` 等）。

构建与运行：

```bash
pnpm build
pnpm --filter @xbghc/gitcode-cli start -- --help
```

> 开发模式：`pnpm --filter @xbghc/gitcode-cli dev`

## 全局选项

- `--verbose`：开启调试日志（等价于将日志级别设为 `debug`）。
- `--quiet`：静默模式（将日志级别设为 `silent`，仅保留命令输出）。
- `--log-level <level>`：设置日志级别（`fatal|error|warn|info|debug|trace|silent`）。

说明：

- 日志统一通过 `@gitany/shared` 的 logger 输出到 stderr，命令结果仍通过 stdout 输出（例如 `--json`）。
- 也可使用环境变量 `GITANY_LOG_LEVEL` 控制默认日志级别；命令行选项优先级更高。
- 日志默认以易读格式输出；若需要 JSON 结构化日志，可设置环境变量 `GITANY_LOG_FORMAT=json`。

## 命令

> 在 Git 仓库目录中执行命令且不传入 URL 参数时，CLI 会通过 `@gitany/git-lib` 的 `resolveRepoUrl` 自动使用 `git remote get-url origin` 获取仓库地址。

### gitcode parse [git-url]

解析 Git 远程地址并输出 JSON。

```bash
# 显式传入 URL
gitcode parse https://gitcode.com/owner/repo.git

# 在当前 Git 仓库中自动获取 remote
gitcode parse
```

### gitcode auth &lt;subcommand&gt;

子命令：`set-token`

- `set-token <token>`
  - 行为：保存令牌到本地配置文件。

### gitcode repo

仓库相关命令。

#### gitcode repo permission [git-url]

查询当前登录用户在指定仓库（通过仓库链接）的权限。

```bash
gitcode repo permission https://gitcode.com/owner/repo.git
# 或者在仓库目录中直接运行
gitcode repo permission
```

- 调用：`GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission`
- 输出：固定为一个词：`admin | write | read | none`（仓库不存在时返回 `none`）

#### gitcode repo info

仓库信息命令组。

##### gitcode repo info settings &lt;owner&gt; &lt;repo&gt;

显示仓库设置信息。

```bash
gitcode repo info settings myorg myrepo
```

输出示例：

```
仓库设置:
{
  "default_branch": "main",
  "has_issues": true,
  "has_wiki": false,
  "has_pull_requests": true,
  "allow_squash_merge": true,
  "allow_merge_commit": true,
  "allow_rebase_merge": true
}
```

- 调用：`GET /api/v5/repos/{owner}/{repo}/repo_settings`

##### gitcode repo info branches &lt;owner&gt; &lt;repo&gt;

列出仓库的所有分支。

```bash
gitcode repo info branches myorg myrepo
```

输出示例：

```
仓库分支:
  main (默认: 是, 受保护: 是)
  develop (默认: 否, 受保护: 否)
  feature/test (默认: 否, 受保护: 否)
```

- 调用：`GET /api/v5/repos/{owner}/{repo}/branches`

##### gitcode repo info commits &lt;owner&gt; &lt;repo&gt;

显示仓库提交历史。

```bash
gitcode repo info commits myorg myrepo
```

输出示例：

```
仓库提交历史:
  1. a1b2c3d - 修复登录问题
     作者: John Doe <john@example.com>
     时间: 2024-01-15T10:30:00Z

  2. e4f5g6h - 添加新功能
     作者: Jane Smith <jane@example.com>
     时间: 2024-01-14T15:45:00Z
```

- 调用：`GET /api/v5/repos/{owner}/{repo}/commits`

##### gitcode repo info contributors &lt;owner&gt; &lt;repo&gt;

显示仓库贡献者列表。

```bash
gitcode repo info contributors myorg myrepo
```

输出示例：

```
仓库贡献者:
  John Doe <john@example.com> - 42 次贡献
  Jane Smith <jane@example.com> - 28 次贡献
```

- 调用：`GET /api/v5/repos/{owner}/{repo}/contributors`

##### gitcode repo info webhooks &lt;owner&gt; &lt;repo&gt;

列出仓库的 Webhooks。

```bash
gitcode repo info webhooks myorg myrepo
```

输出示例：

```
仓库 Webhooks:
  ID: 123
  URL: https://example.com/webhook
  名称: web
  活跃: 是
  事件: push, pull_request
  创建时间: 2024-01-01T00:00:00Z
```

- 调用：`GET /api/v5/repos/{owner}/{repo}/hooks`

### gitcode pr

Pull Request 相关命令。

#### gitcode pr list [git-url]

列出指定仓库的 Pull Requests。默认状态为 `open`，默认输出为「标题列表」：

```
- [#18] 修复登录异常
- [#16] CI: 提升缓存命中率
```

```bash
gitcode pr list https://gitcode.com/owner/repo.git

# 或者在仓库目录中直接运行
gitcode pr list

# 带筛选参数：
gitcode pr list git@gitcode.com:owner/repo.git \
  --state open --base main

# 输出 JSON：
gitcode pr list <url> --json
```

- 选项：
  - `--state <state>`：`open | closed | all`（默认 `open`）
  - `--head <ref>`：按源分支或 `repo:branch` 过滤
  - `--base <branch>`：按目标分支过滤
  - `--sort <field>`、`--direction <asc|desc>`：可选排序
  - `--json`：输出原始 JSON 数组
- 调用：`GET /api/v5/repos/{owner}/{repo}/pulls`

### gitcode pr create [git-url]

创建 Pull Request（仅支持部分字段）。

```bash
gitcode pr create https://gitcode.com/owner/repo.git \
  --title "修复登录异常" --head feat/login-fix --base main --body "补充说明：修复 Token 过期报错"

# 或者在仓库目录中直接运行
gitcode pr create --title "修复登录异常" --head feat/login-fix --base main

# 关联 Issue（示例）：
gitcode pr create <url> --title "修复登录异常" --head feat/login-fix --base main --issue 123
```

- 选项：
  - `--title <title>`：PR 标题（必填）
  - `--head <branch>`：源分支名称（不支持跨仓库，必填）
  - `--base <branch>`：目标分支（可选）
  - `--body <text>`：PR 描述内容（可选）
  - `--issue <n>`：将 PR 关联到指定 Issue（可选）
  - `--json`：输出创建结果的原始 JSON
- 字段支持（与 GitCode 文档对齐的子集）：`title`、`head`、`base`、`body`、`issue`
- 调用：`POST /api/v5/repos/{owner}/{repo}/pulls`

#### gitcode pr info

PR 信息命令组。

##### gitcode pr info settings &lt;owner&gt; &lt;repo&gt;

显示 PR 设置信息。

```bash
gitcode pr info settings myorg myrepo
```

输出示例：

```
PR 设置:
  允许合并提交: 是
  允许压缩提交: 是
  允许变基提交: 是
  允许从默认分支更新: 是
  允许工作树继承: 否
  冲突时自动关闭: 是
```

- 调用：`GET /api/v5/repos/{owner}/{repo}/pull_request_settings`

#### gitcode pr comment <pr-number> [git-url]

在 Pull Request 上创建评论。

```bash
gitcode pr comment 123 https://gitcode.com/owner/repo.git --body "这个修复看起来不错！"

# 或者在仓库目录中直接运行
gitcode pr comment 123 --body "需要添加测试用例"

# 从文件读取评论内容
gitcode pr comment 123 --body-file comment.txt

# 使用编辑器编写评论
gitcode pr comment 123 --editor

# 从标准输入读取评论内容
echo "这是一个评论" | gitcode pr comment 123 --body-file -

# 输出 JSON 格式
gitcode pr comment 123 --body "测试评论" --json
```

- 选项：
  - `--body <string>`：指定评论内容
  - `-F, --body-file <file>`：从文件读取评论内容（使用 `-` 从标准输入读取）
  - `-e, --editor`：打开文本编辑器编写评论
  - `--json`：输出原始 JSON 格式
  - `-R, --repo <[HOST/]OWNER/REPO>`：指定其他仓库
- 调用：`POST /api/v5/repos/{owner}/{repo}/pulls/{number}/comments`

#### gitcode pr comments <pr-number> [git-url]

列出指定 Pull Request 的评论。默认输出为「评论 ID 与首行内容」：

```
- [#123] 这个修复看起来不错！
- [#124] 需要添加测试用例
```

```bash
gitcode pr comments 123 https://gitcode.com/owner/repo.git

# 或者在仓库目录中直接运行
gitcode pr comments 123

# 带分页参数：
gitcode pr comments 123 --page 2 --per-page 50

# 按评论类型过滤：
gitcode pr comments 123 --comment-type diff_comment

# 输出 JSON：
gitcode pr comments 123 --json
```

- 选项：
  - `--comment-type <type>`：评论类型（`diff_comment | pr_comment`）
  - `--page <n>`：页码
  - `--per-page <n>`：每页数量
  - `--json`：输出原始 JSON 数组
- 调用：`GET /api/v5/repos/{owner}/{repo}/pulls/{number}/comments`

### gitcode issue list [git-url]

列出指定仓库的 Issues。默认状态为 `open`，默认输出为「标题列表」：

```
- [#42] 修复登录异常
- [#40] CI: 提升缓存命中率
```

```bash
gitcode issue list https://gitcode.com/owner/repo.git

# 或者在仓库目录中直接运行
gitcode issue list

# 带筛选参数：
gitcode issue list git@gitcode.com:owner/repo.git \
  --state open --label bug,help-wanted --page 2 --per-page 50

# 输出 JSON：
gitcode issue list <url> --json
```

- 选项：
  - `--state <state>`：`open | closed | all`（默认 `open`）
  - `--label <labels>`：以逗号分隔的标签列表
  - `--page <n>`：页码
  - `--per-page <n>`：每页数量
  - `--json`：输出原始 JSON 数组
- 调用：`GET /api/v5/repos/{owner}/{repo}/issues`

### gitcode issue view <issue-number> [git-url]

查看指定 Issue 的详情，并可同时列出评论：

```bash
gitcode issue view 42 https://gitcode.com/owner/repo.git

# 查看并显示评论
gitcode issue view 42 --repo owner/repo --comments

# 以 JSON 形式输出
gitcode issue view 42 --comments --json
```

- 选项：
  - `--comments`：同时获取评论列表
  - `--page <n>`：评论分页页码
  - `--per-page <n>`：评论每页数量
  - `--json`：输出原始 JSON
  - `-R, --repo <[HOST/]OWNER/REPO>`：指定仓库
- 调用：`GET /api/v5/repos/{owner}/{repo}/issues/{number}` + `GET /api/v5/repos/{owner}/{repo}/issues/{number}/comments`（在开启 `--comments` 时）

### gitcode issue edit <issue-number> [git-url]

编辑 Issue 的标题、内容、标签等字段：

```bash
# 更新标题和正文
gitcode issue edit 42 owner/repo --title "New title" --body "Updated description"

# 替换标签并设置负责人
gitcode issue edit 42 --repo owner/repo --label bug --label critical --assignee developer

# 直接修改状态
gitcode issue edit 42 owner/repo --state closed
```

- 选项：
  - `--title <string>`：更新标题
  - `--body <string>` / `--body-file <file>`：更新正文
  - `--label <name>`：替换标签（可多次使用）
  - `--assignee <login>`：设置负责人
  - `--milestone <number>`：设置里程碑编号
  - `--state <state>`：设置状态（`open | closed`）
  - `--json`：输出原始 JSON
  - `-R, --repo <[HOST/]OWNER/REPO>`：指定仓库
- 调用：`PATCH /api/v5/repos/{owner}/{repo}/issues/{number}`

### gitcode issue close <issue-number> [git-url]

快速关闭 Issue：

```bash
# 关闭 Issue
gitcode issue close 123 https://gitcode.com/owner/repo.git

# 使用 --repo 指定仓库
gitcode issue close 123 --repo owner/repo
```

- 选项：`--json`、`-R, --repo`
- 调用：`PATCH /api/v5/repos/{owner}/{repo}/issues/{number}`（设置 `state=closed`）

### gitcode issue reopen <issue-number> [git-url]

重新打开已关闭的 Issue：

```bash
# 重新打开 Issue
gitcode issue reopen 123 https://gitcode.com/owner/repo.git

# 使用 --repo 指定仓库
gitcode issue reopen 123 --repo owner/repo
```

- 选项：`--json`、`-R, --repo`
- 调用：`PATCH /api/v5/repos/{owner}/{repo}/issues/{number}`（设置 `state=open`）

### gitcode user

用户相关命令。

#### gitcode user show

显示当前认证用户的详细信息。

```bash
gitcode user show
```

输出示例：

```
用户信息:
  ID: 68526f155e91be1053daf941
  用户名: xbghc
  邮箱: xbghc@noreply.gitcode.com
  登录名: xbghc
  关注者: 0
  关注中: 0
  常用语言: TypeScript, TSX, SCSS, Vue, JavaScript
  头像: https://cdn-img.gitcode.com/eb/dc/e25777167bd9cba77d0d8bb17c1fafe41808204d923fa66a24c70cf63cbd97af.png
  主页: https://gitcode.com/xbghc
```

- 调用：`GET /api/v5/user`
- 显示标准化的用户信息（ID、用户名、邮箱）和详细的用户资料

#### gitcode user namespace

显示当前用户的命名空间信息。

```bash
gitcode user namespace
```

输出示例：

```
用户命名空间:
  ID: 123456
  路径: myusername
  名称: My Username
  主页: https://gitcode.com/myusername
  类型: user
```

- 调用：`GET /api/v5/user/namespace`

## 环境变量

- `GITCODE_TOKEN`：令牌（高优先级覆盖本地存储）

### 加载 .env（使用 NODE_OPTIONS）

Node.js v20.6.0 起内置支持通过 `--env-file` 加载 `.env` 文件。推荐用 `NODE_OPTIONS` 开启：

```bash
# 当前会话生效
export NODE_OPTIONS="--env-file=.env"

# 运行 CLI（示例）
gitcode --help

# 指定多个 env 文件（后者覆盖前者）
export NODE_OPTIONS="--env-file=.env --env-file=.env.local"
```

或对单条命令内联设置：

```bash
NODE_OPTIONS="--env-file=.env" gitcode pr list
```

注意：
- `.env` 路径基于当前工作目录（`process.cwd()`）。
- 内置加载器按 `KEY=VALUE` 简单解析，不做变量插值。
- 需要 Node ≥ 20.6；更旧版本请显式 `export` 环境变量或升级 Node。

## 本地存储路径

CLI 将认证信息保存到：`~/.gitany/gitcode/config.json`

## 开发辅助

在编写自定义命令时，可使用 `withClient` 工具统一创建 `GitcodeClient` 并处理错误：

```ts
import { withClient } from '@xbghc/gitcode-cli/utils/with-client';

await withClient(async (client) => {
  const user = await client.user.getProfile();
  console.log(user.login);
});
```
