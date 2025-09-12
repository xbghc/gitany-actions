---
title: Pull Requests API
---

# Pull Requests（PR）

提供与 Pull Request 相关的类型与路径构建工具，并通过 `GitcodeClient` 暴露便捷方法。

适用接口：

- 列表：GET `/api/v5/repos/{owner}/{repo}/pulls`
- 创建：POST `/api/v5/repos/{owner}/{repo}/pulls`

## 类型与导出

- `ListPullsQuery`：PR 列表查询参数（`state`、`page`、`per_page`、`head`、`base` 等）。
- `ListPullsParams`：包含 `owner`、`repo` 与可选 `query`。
- `Branch`：PR 分支信息结构（`label`、`ref`、`sha` 等）。
- `PullRequest`：PR 的最小字段表示（`id`、`number`、`title`、`state`、`head`、`base` 等）。
- `ListPullsResponse`：`PullRequest[]`。
- `CreatePullBody`：创建 PR 可用字段（`title`、`head`、`base`、`body`、`issue`）。
- `listPullsUrl(owner, repo)`：构建列表接口绝对 URL。
- `createPullUrl(owner, repo)`：构建创建接口路径（绝对 URL）。

以上均从包入口 `@gitany/gitcode` 导出。其中 `createPullUrl` 使用默认常量 `API_BASE`（`https://gitcode.com/api/v5`）构建绝对 URL。

## 使用示例

```ts
import { GitcodeClient, listPullsUrl, createPullUrl, type CreatePullBody } from '@gitany/gitcode';

const client = new GitcodeClient({ token: process.env.GITCODE_TOKEN ?? null });

// 1) 列表 PR（通过 options.query 传参）
const listUrl = listPullsUrl('owner', 'repo');
const pulls = await client.request(listUrl, 'GET', {
  query: { state: 'open', page: 1, per_page: 20 },
});

// 2) 创建 PR（使用绝对 URL 构建）
const createPath = createPullUrl('owner', 'repo');
const body: CreatePullBody = { title: '修复登录异常', head: 'feat/login-fix', base: 'main', body: '说明文本', issue: 123 };
const pr = await client.request(createPath, 'POST', { body: JSON.stringify(body) });
```

也可直接使用 `GitcodeClient` 提供的封装方法：

```ts
const pulls2 = await client.listPullRequests('owner', 'repo', { state: 'open' });
const pr2 = await client.createPullRequest('owner', 'repo', { title: '修复', head: 'feat/x' });
```

或使用模块方式调用：

```ts
const pulls3 = await client.pr.list('owner', 'repo', { state: 'open' });
const pr3 = await client.pr.create('owner', 'repo', { title: '修复', head: 'feat/x' });
```

## 说明

- 网络请求层统一由内部的 `utils/http.ts` 中的 `httpRequest` 处理，对外行为不变。
- 字段与返回值与 GitCode 文档保持一致的最小子集，返回结果会通过 Zod 进行结构校验。
