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

- `ListIssuesQuery`：Issue 列表查询参数（`state`、`labels`、`page`、`per_page`、`sort`）。
- `ListIssuesParams`：包含 `owner`、`repo` 与可选 `query`。
- `Issue`：Issue 的最小字段表示（`id`、`html_url`、`number`、`state`、`title`、`body`、`user`、`assignees`、`labels`、`created_at`、`updated_at`）。
- `ListIssuesResponse`：`Issue[]`。
- `IssueCommentsQuery`：Issue 评论查询参数（`page`、`per_page`）。
- `IssueComment`：Issue 评论的最小字段表示（`id`、`comment_id?`、`body`、`user`、`created_at?`、`updated_at?`）。
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

以上均从包入口 `@xbghc/gitcode-api` 导出。

## 使用示例

### 列表操作

```ts
import { GitcodeClient, listIssuesUrl } from '@xbghc/gitcode-api';

const client = new GitcodeClient({ token: process.env.GITCODE_TOKEN ?? null });

// 1) 列表 Issues（通过 options.query 传参）
const listUrl = listIssuesUrl('owner', 'repo');
const issues = await client.request(listUrl, 'GET', {
  query: { state: 'open', page: 1, per_page: 20, labels: 'bug', sort: 'updated' },
});

// 也可通过模块方式调用：
const issues2 = await client.issue.list('https://gitcode.com/owner/repo.git', {
  state: 'open',
  sort: 'updated',
});

// 2) 列表 Issue 评论
const comments = await client.issue.comments('https://gitcode.com/owner/repo.git', 42, {
  page: 1,
  per_page: 20,
});
```

### 读取与更新操作

```ts
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 1) 获取单个 Issue 详情
const issueDetails = await client.issue.get('https://gitcode.com/owner/repo', 42);
console.log(issueDetails.title, issueDetails.state);

// 2) 更新一个 Issue
const updatedIssue = await client.issue.update('https://gitcode.com/owner/repo', 42, {
  title: '新的 Issue 标题',
  body: '更新后的内容。',
  state: 'closed', // 可选
});
console.log(`Issue #${updatedIssue.number} 已更新并关闭。`);
```

### 创建操作

```ts
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 1) 创建 Issue
const issue = await client.issue.create({
  owner: 'username',
  body: {
    repo: 'my-repo',
    title: '发现一个 Bug',
    body: '详细描述 bug 的复现步骤...',
    assignee: 'developer-username', // 可选，单个用户名或逗号分隔的多个用户名
    milestone: 1, // 可选
    labels: 'bug,critical', // 可选
  },
});

console.log(`Issue 创建成功: ${issue.html_url}`);

// 1b) 创建 Issue（多个 assignees）
const issueMultiple = await client.issue.create({
  owner: 'username',
  body: {
    repo: 'my-repo',
    title: '需要多人协作的任务',
    body: '这个任务需要多个开发者共同完成...',
    assignee: 'user1,user2,user3', // 多个用户名用逗号分隔
  },
});

console.log(`分配给: ${issueMultiple.assignees.map(a => a.login).join(', ')}`);

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

// 3) 更新 Issue 评论
const updatedComment = await client.issue.updateComment({
  owner: 'username',
  repo: 'my-repo',
  comment_id: comment.id,
  body: {
    body: '这是更新后的评论内容。',
  },
});
console.log(`评论 ${updatedComment.id} 已更新。`);
```

## 说明

- 网络请求层统一由内部的 `utils/http.ts` 中的 `httpRequest` 处理，自 2025-09-17 起使用 `got` 并支持 `searchParams`/`json` 等标准化选项，同时通过 ETag 自动缓存未变更的响应。
- 字段与返回值与 GitCode 文档保持一致的最小子集，返回结果会通过 Zod 进行结构校验。

### ⚠️ GitCode API 文档勘误

**关于 `assignee` vs `assignees` 的不对称设计**：

GitCode API 在请求参数和响应数据中使用了不同的字段格式：

**请求参数**（创建/更新 Issue）：
- 字段名：`assignee`（单数）
- 类型：字符串
- 格式：单个用户名或逗号分隔的多个用户名
- 示例：`"user1"` 或 `"user1,user2,user3"`

**响应数据**（所有 Issue 接口）：
- 字段名：`assignees`（复数）
- 类型：对象数组
- 格式：每个对象包含完整的用户信息

`assignees` 数组中的每个对象包含以下字段：
- `avatar_url?`: 头像 URL（可选）
- `html_url`: 用户主页 URL
- `id`: 用户 ID
- `login`: 用户登录名
- `name`: 用户显示名称

本库已根据实际 API 行为实现：
- `CreateIssueBody` 和 `UpdateIssueBody` 使用 `assignee: string`（请求格式）
- 响应 schema 使用 `assignees: UserSummary[]`（响应格式）
