---
title: Pull Requests API
---

# Pull Requests（PR）

提供与 Pull Request 相关的类型与路径构建工具，并通过 `GitcodeClient` 暴露便捷方法。

适用接口：

- 列表：GET `/api/v5/repos/{owner}/{repo}/pulls`
- 创建：POST `/api/v5/repos/{owner}/{repo}/pulls`
- 设置：GET `/api/v5/repos/{owner}/{repo}/pull_request_settings`
- 评论：GET `/api/v5/repos/{owner}/{repo}/pulls/{number}/comments`
- 创建评论：POST `/api/v5/repos/{owner}/{repo}/pulls/{number}/comments`

## 类型与导出

- `ListPullsQuery`：PR 列表查询参数（`state`、`page`、`per_page`、`head`、`base` 等）。
- `ListPullsParams`：包含 `owner`、`repo` 与可选 `query`。
- `Branch`：PR 分支信息结构（`label`、`ref`、`sha` 等）。
- `PullRequest`：PR 的最小字段表示（`id`、`number`、`title`、`state`、`head`、`base` 等）。
- `ListPullsResponse`：`PullRequest[]`。
- `CreatePullBody`：创建 PR 可用字段（`title`、`head`、`base`、`body`、`issue`）。
- `PullRequestSettings`：PR 设置信息（合并策略等）。
- `PRComment`：PR 评论信息。
- `PRCommentQueryOptions`：PR 评论查询参数。
- `CreatePrCommentBody`：创建PR评论的请求体。
- `CreatePrCommentParams`：创建PR评论的参数。
- `CreatedPrComment`：已创建的PR评论。
- `listPullsUrl(owner, repo)`：构建列表接口绝对 URL。
- `createPullUrl(owner, repo)`：构建创建接口路径（绝对 URL）。
- `pullRequestSettingsUrl(owner, repo)`：构建设置接口 URL。
- `prCommentsUrl(owner, repo, number)`：构建评论接口 URL。
- `createPrCommentUrl(owner, repo, prNumber)`：构建创建评论接口 URL。

以上均从包入口 `@gitany/gitcode` 导出。其中 `createPullUrl` 使用默认常量 `API_BASE`（`https://gitcode.com/api/v5`）构建绝对 URL。

## 使用示例

```ts
import { GitcodeClient, listPullsUrl, createPullUrl, type CreatePullBody } from '@gitany/gitcode';

const client = new GitcodeClient();

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
const pulls2 = await client.pr.list('owner', 'repo', { state: 'open' });
const pr2 = await client.pr.create('owner', 'repo', { title: '修复', head: 'feat/x' });
```

或使用模块方式调用：

```ts
const pulls3 = await client.pr.list('owner', 'repo', { state: 'open' });
const pr3 = await client.pr.create('owner', 'repo', { title: '修复', head: 'feat/x' });
```

### 新增功能：PR 设置和评论

```ts
// 获取 PR 设置
const settings = await client.pr.getSettings('owner', 'repo');
console.log('允许合并提交:', settings.allow_merge_commits);

// 获取 PR 评论
const comments = await client.pr.comments('owner', 'repo', 123);
comments.forEach(comment => {
  console.log(comment.user.login, comment.body);
});

// 创建 PR 评论
const comment = await client.pr.createComment('owner', 'repo', 123, {
  body: '这个修复看起来不错！'
});
console.log('评论创建成功:', comment.id);
```

## 类型定义

### `PullRequestSettings`

PR 设置信息：

```typescript
interface PullRequestSettings {
  allow_merge_commits: boolean;
  allow_squash_commits: boolean;
  allow_rebase_commits: boolean;
  allow_updates_from_default_branch: boolean;
  allow_worktree_inheritance: boolean;
  allow_auto_close_on_conflict: boolean;
}
```

### `PRComment`

PR 评论信息：

```typescript
interface PRComment {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}
```

### `CreatePrCommentBody`

创建 PR 评论的请求体：

```typescript
interface CreatePrCommentBody {
  /** 评论内容 */
  body: string;
}
```

### `CreatePrCommentParams`

创建 PR 评论的参数：

```typescript
interface CreatePrCommentParams {
  /** 仓库所有者（用户或组织） */
  owner: string;
  /** 仓库名称（不带.git） */
  repo: string;
  /** PR 编号 */
  number: number;
  /** 评论数据 */
  body: CreatePrCommentBody;
}
```

### `CreatedPrComment`

已创建的 PR 评论：

```typescript
interface CreatedPrComment {
  /** 评论 ID */
  id: string;
  /** 评论内容 */
  body: string;
}
```

## 说明

- 网络请求层统一由内部的 `utils/http.ts` 中的 `httpRequest` 处理，并通过 ETag 自动缓存未变更的响应，对外行为不变。
- 字段与返回值与 GitCode 文档保持一致的最小子集，返回结果会通过 Zod 进行结构校验。
- 2025-09-13 更新：新增 PR 设置和评论功能支持。
- 2025-09-14 更新：新增 PR 创建评论功能支持。
