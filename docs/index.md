---
title: 首页
---

# GitCode Actions

GitCode 平台的开发者工具集 — API 客户端、命令行工具、自动化工作流

## 快速体验

```bash
npm i -g @xbghc/gitcode-cli
gitcode auth set-token YOUR_TOKEN
gitcode pr checkout 42   # 一键切到 PR 分支
```

## 核心包

| 包                                             | 说明                               |
| ---------------------------------------------- | ---------------------------------- |
| [`@xbghc/gitcode-api`](./gitcode-api/)         | 强类型 REST 客户端，支持缓存与重试 |
| [`@xbghc/gitcode-cli`](./gitcode-cli/)         | 命令行工具，类似 `gh` 的体验       |
| [`@xbghc/gitcode-actions`](./gitcode-actions/) | 事件监听、容器编排、AI 助手        |

## 开发

```bash
# 环境要求：Node.js 22+, pnpm 10+

pnpm install    # 安装依赖
pnpm build      # 构建所有包
pnpm dev        # 开发模式
```

## 文档命令

```bash
pnpm docs:dev     # 启动文档站点
pnpm docs:build   # 构建静态文档
pnpm docs:preview # 预览打包产物
```

## 链接

- [贡献指南](./contributing.md)
- [发布说明](./PUBLISHING.md)
- [GitHub 仓库](https://github.com/xbghc/gitcode-actions)
