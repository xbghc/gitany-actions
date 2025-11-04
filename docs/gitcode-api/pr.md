---
title: Pull Requests API
---

# Pull Requests（PR）

PR 模块封装了列表、创建、评论、设置以及统计等常见操作，同时提供对应的 URL 构建函数与 Zod Schema。

适用接口：

- 列表：GET `/api/v5/repos/{owner}/{repo}/pulls`
- 创建：POST `/api/v5/repos/{owner}/{repo}/pulls`
- 评论：GET `/api/v5/repos/{owner}/{repo}/pulls/{number}/comments`
- 创建评论：POST `/api/v5/repos/{owner}/{repo}/pulls/{number}/comments`
- 设置：GET `/api/v5/repos/{owner}/{repo}/pull_request_settings`
- 统计：GET `/api/v5/repos/{owner}/{repo}/pull_requests/count`

## 导出与类型

- `ListPullsQuery`、`ListPullsParams`、`PullRequest`、`ListPullsResponse`。
- `CreatePullBody`：创建 PR 的请求体字段。
- `PRComment`、`PRCommentQueryOptions`、`CreatedPrComment`。
- `PullRequestSettings`：仓库 PR 配置。
- `PrCount`：PR 数量统计（按状态聚合）。
- URL/Schema：`listPullsUrl`、`createPullUrl`、`prCommentsUrl`、`createPrCommentUrl`、`pullRequestSettingsUrl`、`prCountUrl` 及对应的 Schema。

以上均可从包入口 `@xbghc/gitcode-api` 引入。

## 客户端用法

```ts
import { GitcodeClient } from '@xbghc/gitcode-api';

const repoUrl = 'https://gitcode.com/owner/repo.git';
const client = new GitcodeClient(process.env.GITCODE_TOKEN);

// 1) 列表 PR（带查询参数）
const pulls = await client.pr.list(repoUrl, { state: 'open', per_page: 50 });

// 2) 创建 PR
await client.pr.create(repoUrl, {
  title: '修复登录异常',
  head: 'feat/login-fix',
  base: 'main',
  body: '补充说明',
});

// 3) 获取评论与创建评论
const comments = await client.pr.comments(repoUrl, 123, { comment_type: 'pr_comment' });
const created = await client.pr.createComment(repoUrl, 123, '这个修复看起来不错！');

// 4) 读取仓库的 PR 设置
const settings = await client.pr.getSettings('owner', 'repo');

// 5) 统计 PR 数量（open/merged/closed）
const count = await client.pr.count(repoUrl);
console.log(count.open, count.merged, count.closed);
```

### 直接使用 URL 构建器

```ts
import { GitcodeClient, listPullsUrl } from '@xbghc/gitcode-api';

const client = new GitcodeClient();
const url = listPullsUrl('owner', 'repo');
const data = await client.request(url, 'GET', {
  searchParams: { state: 'closed', per_page: 20 },
});
```

## Schema 说明

- 所有响应均由 Zod 校验，类型字段与 GitCode API 文档保持一致。
- `PRComment` 除基础字段外还包含 `position`、`diff_hunk` 等原始属性，便于对齐差异信息。
- `PrCount` 结构：`{ open: number; merged: number; closed: number; total: number }`。

### pullRequestSchema

PR 对象中的分支信息（`head` 和 `base`）使用 `branchSchema`，其中：

- `head.user` 和 `base.user`：使用 `userSummarySchema.nullable().optional()`，包含用户基本信息（id、login、name、avatar_url、html_url）。当源分支所在仓库或用户被删除时，该字段可能为 `null` 或 `undefined`
- `head.repo` 和 `base.repo`：使用 `repoSchema.nullable().optional()`，其中 `repo.owner` 也使用 `userSummarySchema.nullable()`

所有用户和仓库信息都是可序列化的纯 JSON 对象，适合前端缓存（如 IndexedDB）。

## 更新记录

- **2025-11-04**：
  - 修复 `branchSchema` 中 `user` 和 `repo` 字段的类型定义，支持 `null` 和 `undefined`，解决源仓库或用户被删除时的 Zod 验证错误
  - 完善类型定义，确保 PR 中的分支和仓库信息使用明确的用户类型（`userSummarySchema`），支持序列化和缓存
- **2025-09-13**：新增 PR 设置、评论创建与 PR 数量统计封装；所有响应经 Zod 校验。
- **2025-09-17**：所有请求改用 `searchParams`/`json` 选项，并继承 HTTP 重试与调试日志能力。
