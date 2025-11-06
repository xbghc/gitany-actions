# GitCode Actions

GitCode Actions 是一个基于 pnpm 的 TypeScript monorepo，围绕 GitCode 平台提供 API 客户端、命令行工具、自动化工作流、容器工具链以及配套服务。代码与文档通过 VitePress 维护，默认使用 Node.js 22 运行时。

## 核心包

| 包                              | 说明                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `@xbghc/gitcode-api`            | 强类型的 GitCode REST 客户端，封装用户、仓库、PR、Issue 等模块并提供响应缓存与重试策略。 |
| `@xbghc/gitcode-cli`            | `gitcode` 命令行工具，支持认证、仓库/PR/Issue 查询与评论等交互式操作。                   |
| `@xbghc/gitcode-actions`        | 事件监听、容器编排与 AI 评论助手工具集，可用于构建自动化工作流。                         |
| `@xbghc/gitcode-actions-server` | 基于 Express 的后端服务，对外暴露 GitCode API 转发与自动化能力。                         |
| `@xbghc/gitcode-dashboard`      | Vue 3 管理面板，封装 GitCode 仓库与 Issue 的可视化操作界面。                             |

## 环境要求

- Node.js 22（可通过 `.nvmrc` 对齐版本要求）
- pnpm 10（workspace 使用 `pnpm@10.15.0`）
- Docker（`@xbghc/gitcode-actions` 的容器函数依赖 `dockerode` 与宿主 Docker daemon）
- GitCode 访问令牌（用于 API 与 CLI 调用）

## 快速开始

```bash
# 克隆仓库
git clone <repository-url>
cd gitcode-actions

# 安装依赖
pnpm install

# 构建所有包
pnpm build
```

常用 workspace 脚本：

- `pnpm dev`：并行启动各包的开发模式
- `pnpm lint` / `pnpm format`：ESLint 与 Prettier 检查
- `pnpm clean`：清理各包的构建产物
- `pnpm docs:dev | docs:build | docs:preview`：VitePress 文档调试、构建与预览
- `pnpm dev:core` / `pnpm dev:server` / `pnpm dev:dashboard`：聚焦核心自动化、后端或前端开发
- `pnpm d` / `pnpm d:git` / `pnpm d:docker`：构建后分别启动 GitCode、Git、Docker 集成演示脚本

## CLI 速览

`@xbghc/gitcode-cli` 在构建后提供 `gitcode` 可执行文件：

```bash
# 解析仓库 URL，输出结构化信息
gitcode parse https://gitcode.com/owner/repo.git

# 授权管理
gitcode auth set-token <token>    # 保存令牌到 ~/.gitcode/config.json
gitcode auth status                # 查看认证状态
gitcode auth remove-token          # 删除已保存的令牌

# 使用环境变量令牌（临时方式）
GITCODE_TOKEN=your-token gitcode user show
GITCODE_TOKEN=your-token gitcode user namespace

# 仓库权限与信息
gitcode repo permission https://gitcode.com/owner/repo.git
GITCODE_TOKEN=... gitcode repo info branches owner repo
GITCODE_TOKEN=... gitcode repo info webhooks owner repo

# Pull Request 操作
gitcode pr list https://gitcode.com/owner/repo --state all
GITCODE_TOKEN=... gitcode pr create https://gitcode.com/owner/repo --title "新特性" --head feature-branch
GITCODE_TOKEN=... gitcode pr info settings owner repo
GITCODE_TOKEN=... gitcode pr comments 12 https://gitcode.com/owner/repo --commentType pr_comment

# Issue 操作
gitcode issue list https://gitcode.com/owner/repo --state closed
GITCODE_TOKEN=... gitcode issue create owner repo --title "Bug" --body "重现步骤"
GITCODE_TOKEN=... gitcode issue comment 42 --repo owner/repo "感谢反馈！"
```

CLI 底层通过 `GitCodeClient` 发起请求，并在出错时提供统一的错误处理与 JSON 输出选项。

## API 客户端示例

```ts
import { GitCodeClient } from '@xbghc/gitcode-api';

const client = new GitCodeClient(process.env.GITCODE_TOKEN);

const profile = await client.user.getProfile();
const namespace = await client.user.getNamespace();

const repoSettings = await client.repo.getSettings('owner', 'repo');
const contributors = await client.repo.getContributors('owner', 'repo');
const prCount = await client.pr.count('https://gitcode.com/owner/repo');
const issues = await client.issue.list('https://gitcode.com/owner/repo', { state: 'open' });
```

客户端模块化导出，可单独访问 `client.repo`, `client.pr`, `client.issue`, `client.user` 与 `client.auth`，并对响应执行 Zod 校验和 ETag 缓存。

## 自动化与容器工具

`@xbghc/gitcode-actions` 聚焦构建自动化：

- 事件监听：`watchPullRequest` 与 `watchIssues` 会持久化状态到 `~/.gitcode/watchers`，支持 `start()`、`stop()` 与单次 `runOnce()`。
- 容器工具链：提供 `createPrContainer`、`createWorkspaceContainer`、`testShaBuild`、`copyToContainer`、`collectDiagnostics` 等函数，用于拉起 PR 隔离环境、执行构建、采集日志并清理容器。

```ts
import { GitCodeClient } from '@xbghc/gitcode-api';
import { watchPullRequest, createPrContainer } from '@xbghc/gitcode-actions';

const client = new GitCodeClient(process.env.GITCODE_TOKEN!);

watchPullRequest(client, 'https://gitcode.com/owner/repo', {
  intervalSec: 10,
  onOpen: (pr) => console.log(`PR #${pr.number} opened: ${pr.title}`),
  onComment: (pr, comment) => console.log(`PR #${pr.number} 评论: ${comment.body}`),
  container: { image: 'node:22-bookworm' },
}).start();

await createPrContainer('https://gitcode.com/owner/repo', { id: 1, number: 12 } as any, {
  image: 'node:22-bookworm',
  env: { NODE_ENV: 'test' },
});
```

**Chat 功能重大更新**：`chat()` 函数现在使用 Anthropic SDK 而非 Claude CLI，显著提升性能：

- 启动时间从 30-60 秒降至 <1 秒
- 内存占用从 ~500MB 降至 <50MB
- 返回结构化元数据（模型信息、token 使用量等）
- 完全向后兼容现有 API

```ts
import { chat } from '@xbghc/gitcode-actions';

// 基础使用（需要设置 ANTHROPIC_API_KEY 环境变量）
const result = await chat('https://gitcode.com/owner/repo', '请解释这段代码的功能');

console.log(result.output); // Claude 的回复
console.log(result.metadata.tokensUsed); // Token 使用统计

// 自定义参数
const result2 = await chat(repoUrl, prompt, {
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 16000,
  temperature: 0.5,
  sha: 'main', // 指定代码分支/提交
});
```

## 服务与前端

- **Server**：`packages/server` 提供 Express 路由（Issue、PR、Repo 等），整合 GitCode Token 中间件并内置 Swagger 文档输出，支持 `.env` 配置与 `pnpm --filter @xbghc/gitcode-actions-server dev` 启动。
- **Dashboard**：`packages/gitcode-dashboard` 基于 Vue 3 + Element Plus，调用 API 客户端实现仓库概览、Issue 与 PR 管理，可通过 `pnpm --filter @xbghc/gitcode-dashboard dev` 启动。

## 环境与认证

**CLI 认证**（推荐）：

```bash
gitcode auth set-token <token>  # 保存到 ~/.gitcode/config.json
gitcode auth status             # 查看认证状态
```

**环境变量配置**（临时或 CI/CD 环境）：

```bash
GITCODE_TOKEN=your-token        # 认证令牌（优先级高于配置文件）
GITCODE_API_BASE=https://gitcode.com/api/v5
GITCODE_AUTH_STYLE=bearer
NODE_ENV=development            # 开发环境（自动启用 HTTP 调试日志）
ANTHROPIC_API_KEY=sk-ant-xxx    # AI 评论助手所需的 Claude API 密钥
```

**令牌读取优先级**：环境变量 > 配置文件（`~/.gitcode/config.json`）

自动化与 CLI 默认使用 `~/.gitcode` 目录存储本地状态（watcher 状态、配置文件等，容器标签以 `gitcode.*` 前缀标识）。

## 文档与规范

- 项目文档位于 `docs/`，使用 VitePress (`pnpm docs:*`) 构建。
- 统一代码风格：ESLint + Prettier，TypeScript 采用 `tsconfig.base.json` 中的严格配置。

## 贡献指南

1. Fork 仓库并创建分支（`git checkout -b feature/awesome`）。
2. 开发过程中保持文档同步，必要时更新 `docs/*`。
3. 提交前运行 `pnpm lint`、`pnpm build`，并根据包需求运行额外测试或脚本。
4. 通过 Pull Request 提交，并附带操作日志或截图（若涉及 CLI/UI 变更）。

## 许可证

MIT
