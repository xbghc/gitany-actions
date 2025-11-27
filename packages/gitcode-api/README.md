# @xbghc/gitcode-api

GitCode REST API 客户端 — 强类型、模块化、开箱即用

## 安装

```bash
npm i @xbghc/gitcode-api
```

## 快速开始

```ts
import { GitCodeClient } from '@xbghc/gitcode-api';

const client = new GitCodeClient(process.env.GITCODE_TOKEN);

// Issue
const issues = await client.issue.list(repoUrl, { state: 'open' });
await client.issue.create(repoUrl, { title: 'Bug', body: '...' });

// Pull Request
const prs = await client.pr.list(repoUrl);
await client.pr.create(repoUrl, { title: '新功能', head: 'feature' });

// 仓库
const branches = await client.repo.getBranches('owner', 'repo');
const notifications = await client.repo.getNotifications('owner', 'repo');
```

## 模块一览

| 模块           | 功能                              |
| -------------- | --------------------------------- |
| `client.issue` | 创建、列表、评论、关闭、重开      |
| `client.pr`    | 创建、列表、评论、获取设置        |
| `client.repo`  | 分支、提交、贡献者、Webhook、通知 |
| `client.user`  | 用户信息                          |

## 认证

```bash
# 环境变量（推荐）
export GITCODE_TOKEN=your-token

# 或直接传入
const client = new GitCodeClient('your-token');
```

Token 获取：[GitCode 访问令牌](https://gitcode.com/profile/personal_access_tokens)

## 特性

- 🔒 Zod 运行时校验
- 🔄 自动重试与 ETag 缓存
- 📦 ESM 模块
- 💡 完整 TypeScript 类型

## API 参考

完整文档：[docs/gitcode-api](../../docs/gitcode-api/index.md)

## License

MIT
