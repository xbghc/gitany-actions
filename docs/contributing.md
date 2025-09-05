---
title: 贡献指南
---

# 贡献指南

本仓库使用 pnpm 管理的 TypeScript Monorepo，包含：

- `@gitany/gitcode`：工具库（packages/gitcode）
- `@gitany/cli`：命令行工具（packages/cli）
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
- 变更 `packages/cli` → 更新 `docs/cli/*`

仓库提供本地 Git hook 与 CI 检查来提醒未同步文档的变更。

### 本地 Git Hook（Husky）

项目使用 Husky 管理 Git 钩子，安装依赖后会自动启用（`package.json` 中 `prepare: husky`）。

提交前，`pre-commit` 会检查：

- 若改动了 `packages/**` 源码，且
- 本次提交未改动 `docs/**`

则拒绝提交并提示补充文档。临时跳过（不推荐）：

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
- `packages/cli/src/*` → `docs/cli/`

如遇仅重构/重命名且不影响对外接口的场景，请在 PR 中说明无需变更文档的理由。
