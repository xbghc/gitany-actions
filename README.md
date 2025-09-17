# GitAny Actions

一个现代化的 TypeScript monorepo，提供与 GitCode 平台集成的工具和库。

## 项目概览

GitAny Actions 是一个 TypeScript 项目，提供以下核心功能：

- **@gitany/cli**: 命令行界面工具，提供 `gitcode` 命令行接口
- **@gitany/gitcode**: GitCode API 客户端库，提供完整的 GitCode 平台集成
- **@gitany/git-lib**: Git 命令包装器，提供跨平台的 Git 操作支持
- **@gitany/core**: 核心共享工具和功能库

## 快速开始

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd gitany-actions

# 安装依赖
pnpm install

# 构建项目
pnpm build
```

### 使用 CLI 工具

```bash
# 查看帮助
gitcode --help

# 用户认证
gitcode auth login

# 查看用户信息
gitcode user show
gitcode user namespace

# 仓库操作
gitcode repo info settings owner repo
gitcode repo info branches owner repo
gitcode repo info commits owner repo
gitcode repo info contributors owner repo
gitcode repo info webhooks owner repo

# Pull Request 操作
gitcode pr list https://gitcode.com/owner/repo
gitcode pr create https://gitcode.com/owner/repo --title "新功能" --head feature-branch
gitcode pr info settings owner repo

# Issue 操作
gitcode issue list https://gitcode.com/owner/repo
gitcode issue view 42 https://gitcode.com/owner/repo
gitcode issue edit 42 --repo owner/repo --label bug
gitcode issue close 42 --repo owner/repo
gitcode issue reopen 42 --repo owner/repo
```

### 使用 API 库

```typescript
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();

// 用户操作
const user = await client.user.getProfile();
const namespace = await client.user.getNamespace();

// 仓库操作
const settings = await client.repo.getSettings('owner', 'repo');
const branches = await client.repo.getBranches('owner', 'repo');
const commits = await client.repo.getCommits('owner', 'repo');
const contributors = await client.repo.getContributors('owner', 'repo');

// PR 操作
const pulls = await client.pr.list('https://gitcode.com/owner/repo');
const prSettings = await client.pr.getSettings('owner', 'repo');

// Issue 操作
const issues = await client.issue.list('https://gitcode.com/owner/repo');
```

## 项目结构

```
packages/
├── cli/           # 命令行界面工具
│   ├── src/
│   │   ├── commands/    # CLI 命令实现
│   │   └── index.ts     # CLI 入口
│   └── README.md
├── gitcode/       # GitCode API 客户端
│   ├── src/
│   │   ├── api/         # API 类型定义和 URL 构建
│   │   ├── client/      # 客户端实现
│   │   └── index.ts     # 包入口
│   └── README.md
├── git-lib/       # Git 命令包装器
│   ├── src/
│   │   ├── git.ts       # Git 操作函数
│   │   └── index.ts     # 包入口
│   └── README.md
├── core/          # 核心共享工具
│   ├── src/
│   │   ├── logger.ts    # 日志工具
│   │   └── index.ts     # 包入口
│   └── README.md
└── shared/        # 共享配置和工具
    ├── src/
    │   ├── logger.ts    # 日志配置
    │   └── index.ts     # 包入口
    └── README.md

docs/                    # 项目文档
├── gitcode/              # GitCode API 文档
├── cli/                  # CLI 使用文档
├── git-lib/              # Git 库文档
└── core/                 # 核心库文档
```

## 开发

### 环境要求

- Node.js 18+
- pnpm 8+

### 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（并行监听）
pnpm dev

# 构建所有包
pnpm build

# 代码检查和格式化
pnpm lint
pnpm format

# 清理构建产物
pnpm clean

# 运行测试
pnpm test

# 生成文档
pnpm docs:dev      # 启动文档服务器
pnpm docs:build    # 构建静态文档
pnpm docs:preview  # 预览构建的文档
```

### 包特定命令

```bash
# 工作特定包
pnpm --filter @gitany/cli dev
pnpm --filter @gitany/gitcode build
pnpm --filter @gitany/core dev
pnpm --filter @gitany/git-lib build
```

## 认证配置

### 环境变量

```bash
export GITANY_TOKEN=your-token
export GITCODE_TOKEN=your-token
export GITCODE_API_BASE=https://gitcode.com/api/v5
```

### 配置文件

配置文件存储在 `~/.gitany/gitcode/config.json`：

```json
{
  "token": "your-access-token",
  "apiBase": "https://gitcode.com/api/v5"
}
```

## API 覆盖范围

### GitCode API 支持

✅ **用户 API**

- 获取用户信息 (`/user`)
- 获取用户命名空间 (`/user/namespace`)

✅ **仓库 API**

- 仓库设置 (`/repos/{owner}/{repo}/repo_settings`)
- 分支管理 (`/repos/{owner}/{repo}/branches`)
- 提交历史 (`/repos/{owner}/{repo}/commits`)
- 贡献者 (`/repos/{owner}/{repo}/contributors`)
- 文件操作 (`/repos/{owner}/{repo}/git/blobs/{sha}`)
- 代码比较 (`/repos/{owner}/{repo}/compare/{base}...{head}`)
- WebHooks (`/repos/{owner}/{repo}/hooks`)
- 仓库权限 (`/repos/{owner}/{repo}/collaborators/self-permission`)

✅ **Pull Request API**

- PR 列表 (`/repos/{owner}/{repo}/pulls`)
- 创建 PR (`/repos/{owner}/{repo}/pulls`)
- PR 评论 (`/repos/{owner}/{repo}/pulls/{number}/comments`)
- PR 设置 (`/repos/{owner}/{repo}/pull_request_settings`)

✅ **Issue API**

- Issue 列表 (`/repos/{owner}/{repo}/issues`)
- Issue 评论 (`/repos/{owner}/{repo}/issues/{number}/comments`)

## 类型安全

所有 API 响应都有完整的 TypeScript 类型定义，使用 Zod 进行运行时验证：

```typescript
import { GitcodeClient, type UserProfile, type RepoSettings } from '@gitany/gitcode';

const client = new GitcodeClient();

// 完全类型安全的 API 调用
const user: UserProfile = await client.user.getProfile();
const settings: RepoSettings = await client.repo.getSettings('owner', 'repo');
```

## 构建系统

- **Bundler**: esbuild 与 TypeScript
- **输出**: ESM 模块，包含 TypeScript 声明文件
- **目标**: Node.js 18+
- **包管理器**: pnpm 与工作空间

## 代码质量

- **TypeScript**: 严格模式，共享 `tsconfig.base.json`
- **ESLint**: `@typescript-eslint` 与自定义规则
- **Prettier**: 2 空格缩进，分号，单引号
- **命名规范**:
  - 文件: 小写 (`client.ts`)
  - 类型: `PascalCase`
  - 函数/变量: `camelCase`

## Git Hooks

- **Pre-commit**: 运行文档同步检查 (`scripts/check-docs-updated.mjs`)
- **Prepare**: 自动安装 Husky hooks

## 清理 PR 容器

若在手动运行过程中需要清理残留或异常状态的 PR 容器，可执行：

```bash
pnpm --filter @gitany/core cleanup
```

## 文档同步

项目强制要求文档与代码同步更新：

- 任何对 `packages/gitcode/src/*` 的更改都需要更新 `docs/gitcode/*`
- 任何对 `packages/cli/src/*` 的更改都需要更新 `docs/cli/*`
- 通过 Git hooks 在 `.husky/pre-commit` 中强制执行

**绕过机制** (不推荐):

```bash
SKIP_DOCS_CHECK=1 git commit -m "..."
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

请确保：

- 代码通过所有检查 (`pnpm lint` 和 `pnpm build`)
- 更新相关文档
- 添加适当的测试

## 许可证

MIT

## 支持

- 📧 邮箱: [support@example.com](mailto:support@example.com)
- 🐛 问题报告: [GitHub Issues](https://github.com/your-org/gitany-actions/issues)
- 📖 文档: [项目文档](https://github.com/your-org/gitany-actions/docs)

## 更新日志

### v0.1.0 (2025-09-13)

- ✨ 新增完整的 GitCode API 支持
- ✨ 新增 CLI 工具：用户管理、仓库操作、PR 管理
- ✨ 新增类型安全的 API 客户端
- ✨ 新增文档同步检查机制
- 🐛 修复认证相关问题
- 📚 完善项目文档和 API 文档
