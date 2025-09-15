---
title: Issues API
---

# Issues

提供与 Issue 相关的类型与路径构建工具，并通过 `GitcodeClient` 暴露便捷方法。

适用接口：

- 列表：GET `/api/v5/repos/{owner}/{repo}/issues`
- 评论：GET `/api/v5/repos/{owner}/{repo}/issues/{number}/comments`
- 创建：POST `/api/v5/repos/{owner}/issues`
- 创建评论：POST `/api/v5/repos/{owner}/{repo}/issues/{number}/comments`

## 类型与导出

### 列表相关
- `ListIssuesQuery`：Issue 列表查询参数（`state`、`labels`、`page`、`per_page`）。
- `ListIssuesParams`：包含 `owner`、`repo` 与可选 `query`。
- `Issue`：Issue 的最小字段表示（`id`、`html_url`、`number`、`state`、`title`、`body`、`user`）。
- `ListIssuesResponse`：`Issue[]`。
- `IssueCommentsQuery`：Issue 评论查询参数（`page`、`per_page`）。
- `IssueComment`：Issue 评论的最小字段表示（`id`、`body`、`user`）。
- `IssueCommentsResponse`：`IssueComment[]`。
- `listIssuesUrl(owner, repo)`：构建列表接口绝对 URL。
- `issueCommentsUrl(owner, repo, number)`：构建评论列表接口绝对 URL。

### 创建相关
- `CreateIssueBody`：创建 Issue 的请求体（`repo`、`title`、`body`、`assignee`、`milestone`、`labels` 等）。
- `CreateIssueParams`：包含 `owner` 与 `body`。
- `CreatedIssue`：创建成功的 Issue 完整字段表示。
- `CreateIssueCommentBody`：创建 Issue 评论的请求体（`body`）。
- `CreateIssueCommentParams`：包含 `owner`、`repo`、`number` 与 `body`。
- `CreatedIssueComment`：创建成功的 Issue 评论完整字段表示。
- `createIssueUrl(owner)`：构建创建 Issue 接口绝对 URL。
- `createIssueCommentUrl(owner, repo, number)`：构建创建 Issue 评论接口绝对 URL。

以上均从包入口 `@gitany/gitcode` 导出。

## 使用示例

### 列表操作

```ts
import { GitcodeClient, listIssuesUrl } from '@gitany/gitcode';

const client = new GitcodeClient({ token: process.env.GITCODE_TOKEN ?? null });

// 1) 列表 Issues（通过 options.query 传参）
const listUrl = listIssuesUrl('owner', 'repo');
const issues = await client.request(listUrl, 'GET', {
  query: { state: 'open', page: 1, per_page: 20, labels: 'bug' },
});

// 也可通过模块方式调用：
const issues2 = await client.issue.list('https://gitcode.com/owner/repo.git', {
  state: 'open',
});

// 2) 列表 Issue 评论
const comments = await client.issue.comments('https://gitcode.com/owner/repo.git', 42, {
  page: 1,
  per_page: 20,
});
```

### 创建操作

```ts
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();

// 1) 创建 Issue
const issue = await client.issue.create({
  owner: 'username',
  body: {
    repo: 'my-repo',
    title: '发现一个 Bug',
    body: '详细描述 bug 的复现步骤...',
    assignee: 'developer-username', // 可选
    milestone: 1, // 可选
    labels: 'bug,critical', // 可选
  },
});

console.log(`Issue 创建成功: ${issue.html_url}`);

// 2) 创建 Issue 评论
const comment = await client.issue.createComment({
  owner: 'username',
  repo: 'my-repo',
  number: 123,
  body: {
    body: '我已经开始处理这个问题了。',
  },
});

console.log(`评论创建成功，ID: ${comment.id}`);
```

## 说明

- 网络请求层统一由内部的 `utils/http.ts` 中的 `httpRequest` 处理，并通过 ETag 自动缓存未变更的响应，对外行为不变。
- 字段与返回值与 GitCode 文档保持一致的最小子集，返回结果会通过 Zod 进行结构校验。
