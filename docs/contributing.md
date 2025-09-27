---
title: 贡献指南
---

# 贡献指南

本仓库使用 pnpm 管理的 TypeScript Monorepo，包含：

- `@gitany/gitcode`：工具库（packages/gitcode）
- `@gitany/git-lib`：Git 命令封装库（packages/git-lib）
- `@xbghc/gitcode-cli`：命令行工具（packages/gitcode-cli）
- `@gitany/core`：核心工具库（packages/core）
- 文档：VitePress（docs）

## 开发约定

- 使用 Node.js >= 18 与 pnpm。
- 代码风格：ESLint + Prettier。
  - Lint：`pnpm lint`，格式化：`pnpm format`
- 构建：`pnpm build`；开发：`pnpm dev`
- 文档：`pnpm docs:dev` / `pnpm docs:build`

## 文档同步策略（必做）

当修改代码时，必须同步更新相应文档：

- 变更 `packages/gitcode` → 更新 `docs/gitcode/*`
- 变更 `packages/gitcode-cli` → 更新 `docs/gitcode-cli/*`

仓库提供本地 Git hook 与 CI 检查来提醒未同步文档的变更。

### 本地 Git Hook（Husky）

项目使用 Husky 管理 Git 钩子，安装依赖后会自动启用（`package.json` 中 `prepare: husky`）。

提交前，`pre-commit` 会检查：

1. **代码质量检查**：运行 `pnpm lint` 确保代码符合规范
2. **文档同步检查**：
   - 若改动了 `packages/**` 源码，且
   - 本次提交未改动 `docs/**`

则会拒绝提交并提示补充文档或修复 lint 错误。临时跳过（不推荐）：

```bash
SKIP_DOCS_CHECK=1 git commit -m "..."
```

### CI 检查（Pull Request / Push）

工作流会对比分支差异并执行同样的检查，未同步文档将失败提醒。

## 提交/PR 规范

- 小步提交，提交信息简明扼要。
- 提交 PR 时，请勾选“已更新相关文档”。
- 在 PR 描述中列出主要变更点与对应文档章节链接。

## 目录映射参考

- `packages/gitcode/src/*` → `docs/gitcode/`
- `packages/git-lib/src/*` → `docs/git-lib/`
- `packages/gitcode-cli/src/*` → `docs/gitcode-cli/`
- `packages/core/src/*` → `docs/core/`

如遇仅重构/重命名且不影响对外接口的场景，请在 PR 中说明无需变更文档的理由。

## 代码质量规范

- 所有提交必须通过 ESLint 检查
- 使用 `pnpm lint` 进行本地代码检查
- 使用 `pnpm format` 进行代码格式化
- 提交前会自动运行 lint 检查，失败则阻止提交
