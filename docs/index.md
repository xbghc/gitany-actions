---
title: 首页
---

# GitAny Monorepo 文档

本仓库包含两个包：

- `@gitany/gitcode`: GitCode API 工具库（认证、请求、URL 解析）。
- `@gitany/cli`: 命令行工具，提供认证与解析能力。

使用 pnpm 管理的 Monorepo，统一 ESLint/Prettier/TypeScript 配置。

## 快速开始

安装依赖：

```bash
pnpm i
```

构建全部包：

```bash
pnpm build
```

开发模式（并行 watch）：

```bash
pnpm dev
```

文档（本页）使用 VitePress：

```bash
pnpm docs:dev     # 启动文档站点
pnpm docs:build   # 构建静态文档
pnpm docs:preview # 预览打包产物
```
