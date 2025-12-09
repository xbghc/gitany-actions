# CLAUDE.md

项目规范文档，说明设计思路和约定。

## Project Overview

GitCode Actions 是一个 TypeScript monorepo，提供 GitCode 平台的 API 客户端、CLI 工具和自动化工作流。

| 包                              | 职责                                          |
| ------------------------------- | --------------------------------------------- |
| `@xbghc/gitcode-api`            | GitCode REST API 客户端（基础层，无内部依赖） |
| `@xbghc/gitcode-cli`            | CLI 工具 (`gitcode` 命令)                     |
| `@xbghc/gitcode-actions`        | 自动化工作流 + Docker 容器管理                |
| `@xbghc/gitcode-actions-server` | Express 后端服务                              |
| `@xbghc/gitcode-dashboard`      | Vue 3 前端                                    |

## Architecture

### 包依赖图

```
@xbghc/gitcode-api (基础层)
    ↓
    ├──> @xbghc/gitcode-cli
    ├──> @xbghc/gitcode-actions
    └──> @xbghc/gitcode-actions-server
              ↓ (运行时 HTTP)
         @xbghc/gitcode-dashboard
```

### 构建顺序

1. `gitcode-api` - standalone
2. `gitcode-cli` - 依赖 api
3. `gitcode-actions` - 依赖 api
4. `gitcode-actions-server` - 依赖 api
5. `gitcode-dashboard` - 运行时依赖 server

使用 `tsconfig.base.json` 的 `references` 字段管理构建顺序，支持增量编译。

## Package Design

### gitcode-api

**组合模式设计**：`GitCodeClient` 通过属性访问子客户端

- `client.auth` - 认证管理
- `client.pr` - Pull Request 操作
- `client.repo` - 仓库操作
- `client.issue` - Issue 操作
- `client.user` - 用户操作

**HTTP 架构决策**：

- 无独立 HTTP 模块，`GitCodeClient` 内部管理 got 实例
- 支持外部传入自定义 got 实例，完全控制 HTTP 行为
- 速率限制/缓存由调用方通过自定义 got 实例实现

### gitcode-cli

- 命令结构：`auth`, `parse`, `repo`, `pr`, `issue`, `user`
- 设计参考 GitHub CLI (gh) 的风格和惯例

### gitcode-actions

**Watcher 模块**：

- 事件驱动架构，TypeScript 类型安全事件
- 状态持久化到 `~/.gitcode/watchers/`
- 支持监听 PR、Issue、Notification

**Container 模块设计原则**：

- 面向 GitCode 场景（Git 仓库测试）
- 工作流优先（完整业务流程而非单个命令包装）
- 原子化操作（函数职责清晰，可灵活组合）
- 不绑定业务（不关心"默认容器"概念，由调用方决定）

**Executor 模块**：

- `ContainerExecutor` - 管理 Docker 容器中的构建步骤
- `ExecutorChain` - 链式 API，快速失败模式

### gitcode-actions-server

- Express 后端，REST API + SSE 实时事件
- 路由：`/api/repo/:owner/:repo/pulls`, `/api/workflow/*`, `/api/watcher/*`
- 服务：`WorkflowService`（构建/lint）、`WatcherService`（实时监听）

### gitcode-dashboard

- Vue 3 + Vite + Element Plus
- Pinia 状态管理
- Axios 连接后端

## Build System

| 包            | 构建工具             | 原因                                  |
| ------------- | -------------------- | ------------------------------------- |
| `gitcode-cli` | TypeScript + esbuild | CLI 打包成单文件 bundle，减少启动时间 |
| 其他包        | TypeScript only      | 库包保留模块结构，便于 tree-shaking   |

## Code Conventions

**TypeScript**：Strict mode，共享 `tsconfig.base.json`

**命名规范**：

- 文件：lowercase (`client.ts`)
- 类型：`PascalCase`
- 函数/变量：`camelCase`

**代码风格**：ESLint + Prettier（2空格、分号、单引号）

**提交信息**：Conventional Commits

```
<type>(<scope>): <subject>
```

类型：`feat` | `fix` | `docs` | `refactor` | `test` | `chore`
范围：`api` | `cli` | `actions` | `server` | `dashboard`

## Quality Gates

**Git Hooks** (Husky)：

- `pre-commit`：lint-staged（ESLint + Prettier 检查）
- `pre-push`：`pnpm build && pnpm typecheck && pnpm test`

**测试规范** (Vitest)：

- 测试文件放在源文件旁：`*.test.ts`
- 单元测试 mock 网络请求
- E2E 测试需要 `GITCODE_TOKEN`

## Key Files

- `tsconfig.base.json` - TypeScript 项目引用
- `eslint.config.cjs` - ESLint flat config
- `prettier.config.cjs` - 代码格式化
- `.husky/` - Git hooks
- `.github/commit-instructions.md` - 提交规范详情
