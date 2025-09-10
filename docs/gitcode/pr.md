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
- `PullRequest`：PR 的最小字段表示（`id`、`number`、`title`、`state` 等）。
- `ListPullsResponse`：`PullRequest[]`。
- `CreatePullBody`：创建 PR 可用字段（`title`、`head`、`base`、`body`、`issue`）。
- `listPullsPath(params)`：构建列表接口路径。
- `createPullPath(owner, repo)`：构建创建接口路径。

以上均从包入口 `@gitany/gitcode` 导出。

## 使用示例

```ts
import { GitcodeClient, listPullsPath, createPullPath, type CreatePullBody } from '@gitany/gitcode';

const client = new GitcodeClient({ baseUrl: 'https://gitcode.com/api/v5', token: process.env.GITCODE_TOKEN ?? null });

// 1) 列表 PR
const listPath = listPullsPath({ owner: 'owner', repo: 'repo', query: { state: 'open', page: 1, per_page: 20 } });
const pulls = await client.request(listPath, { method: 'GET' });

// 2) 创建 PR
const createPath = createPullPath('owner', 'repo');
const body: CreatePullBody = { title: '修复登录异常', head: 'feat/login-fix', base: 'main', body: '说明文本', issue: 123 };
const pr = await client.request(createPath, { method: 'POST', body: JSON.stringify(body) });
```

也可直接使用 `GitcodeClient` 提供的封装方法：

```ts
const pulls2 = await client.listPullRequests('owner', 'repo', { state: 'open' });
const pr2 = await client.createPullRequest('owner', 'repo', { title: '修复', head: 'feat/x' });
```

## 说明

- 网络请求层统一由内部的 `utils/http.ts` 中的 `httpRequest` 处理，对外行为不变。
- 字段与返回值与 GitCode 文档保持一致的最小子集，额外字段将原样透传。

