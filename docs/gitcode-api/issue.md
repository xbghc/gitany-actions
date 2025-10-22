---
title: Issues API
---

# Issues

Issue 模块提供列表、读取、创建、更新以及评论管理等功能，并导出相应的 URL 构建函数与类型。

适用接口：

- 列表：GET `/api/v5/repos/{owner}/{repo}/issues`
- 评论：GET `/api/v5/repos/{owner}/{repo}/issues/{number}/comments`
- 创建：POST `/api/v5/repos/{owner}/issues`
- 创建评论：POST `/api/v5/repos/{owner}/{repo}/issues/{number}/comments`
- 获取详情：GET `/api/v5/repos/{owner}/{repo}/issues/{number}`
- 更新 Issue：PATCH `/api/v5/repos/{owner}/{repo}/issues/{number}`
- 更新评论：PATCH `/api/v5/repos/{owner}/{repo}/issues/comments/{comment_id}`

## 导出与类型

- `ListIssuesQuery`、`ListIssuesParams`、`Issue`、`ListIssuesResponse`。
- `IssueCommentsQuery`、`IssueComment`、`IssueCommentsResponse`。
- `CreateIssueBody`、`CreateIssueParams`、`CreatedIssue`。
- `CreateIssueCommentBody`、`CreateIssueCommentParams`、`CreatedIssueComment`。
- `IssueDetail`、`UpdateIssueBody`、`UpdateIssueParams`、`UpdatedIssue`、`UpdatedIssueComment`。
- URL/Schema：`listIssuesUrl`、`issueCommentsUrl`、`createIssueUrl`、`createIssueCommentUrl`、`getIssueUrl`、`updateIssueUrl` 等。

所有条目均由包入口导出。

## 客户端用法

```ts
import { GitcodeClient } from '@xbghc/gitcode-api';

const repoUrl = 'https://gitcode.com/owner/repo.git';
const client = new GitcodeClient(process.env.GITCODE_TOKEN);

// 1) 列表 Issue 与评论
const issues = await client.issue.list(repoUrl, { state: 'open', per_page: 30 });
const comments = await client.issue.comments(repoUrl, 42, { per_page: 10 });

// 2) 获取与更新 Issue
const detail = await client.issue.get(repoUrl, 42);
const updated = await client.issue.update(repoUrl, 42, { body: `${detail.body}\n\n已确认。` });

// 3) 创建 Issue 与评论
const createdIssue = await client.issue.create({
  owner: 'owner',
  body: {
    repo: 'repo',
    title: '发现一个 Bug',
    body: '详细描述复现步骤',
    assignee: 'user1,user2',
  },
});

const createdComment = await client.issue.createComment({
  owner: 'owner',
  repo: 'repo',
  number: Number(createdIssue.number),
  body: { body: '收到，我来跟进。' },
});

// 4) 更新评论
await client.issue.updateComment({
  owner: 'owner',
  repo: 'repo',
  comment_id: createdComment.id,
  body: { body: '进度更新：已定位问题。' },
});
```

### 直接使用 URL 构建器

```ts
import { GitcodeClient, listIssuesUrl } from '@xbghc/gitcode-api';

const client = new GitcodeClient();
const url = listIssuesUrl('owner', 'repo');
const data = await client.request(url, 'GET', {
  searchParams: { state: 'closed', labels: 'bug', per_page: 20 },
});
```

## 注意事项

- GitCode 的创建/更新请求使用 `assignee`（单数字符串，多个用户名用逗号分隔），响应则返回 `assignees: UserSummary[]`。
- `IssueDetail`/`UpdatedIssue` 包含完整的工作项字段，可用于看板同步。
- 所有响应均经 Zod 校验，不符合结构会抛出异常。

## 更新记录

- **2025-09-13**：新增 Issue 更新、评论更新与详情获取封装。
- **2025-09-12**：提供 Issue 创建与评论创建 API。
