---
title: GitCode API 工具库
---

# @xbghc/gitcode-api（GitCode API 工具库）

封装了访问 [GitCode REST API](https://docs.gitcode.com/docs/apis/) 所需的客户端、类型定义与 URL 构建工具，并附带常用的仓库地址解析与查询参数处理函数。

- **包路径**：`packages/gitcode-api`
- **导出形式**：ESM（`import { GitcodeClient } from '@xbghc/gitcode-api'`）

## 快速开始

```ts
import { GitcodeClient } from '@xbghc/gitcode-api';

// 构造函数可直接接收 token（默认会读取 GITCODE_TOKEN 环境变量）
const client = new GitcodeClient(process.env.GITCODE_TOKEN);

// 也可以稍后通过 auth 模块设置
client.auth.setToken('your-token');

// 通过模块化分组访问不同资源
const pulls = await client.pr.list('https://gitcode.com/owner/repo.git', { state: 'open' });
const issues = await client.issue.list('https://gitcode.com/owner/repo.git', { per_page: 50 });
const profile = await client.user.getProfile();
```

### 请求总览

- 所有请求最终调用 `client.request(url, method, options)`。
- `options.searchParams`：用于 GET 查询参数，自动序列化基础类型。
- `options.json`：发送 JSON 请求体；如需原始体，可使用 `options.body`。
- `options.retry`：控制 `got` 的重试策略（默认继承全局配置并追加 `POST`/`PUT` 重试支持）。
- 内置 ETag 缓存，会在返回 `304` 时复用上次结果；可通过 `isNotModified(result)` 判断复用命中。
- 设置环境变量 `GITCODE_HTTP_DEBUG=1` 可打印请求/响应日志，`GITCODE_HTTP_DEBUG_SHOW_SECRETS=1` 会取消 Header 脱敏。

## 主要导出

### 客户端

- `GitcodeClient`：带 `pr`、`issue`、`repo`、`user` 子模块以及 `auth` 管理器的核心客户端。
- `GitcodeClientAuth`：轻量认证容器，提供 `setToken()` 与 `token()`，默认读取 `GITCODE_TOKEN`。

### 工具函数

- `parseGitUrl(url)`：解析 HTTPS/SSH 仓库地址，返回 `{ owner, repo, host? }`，无法解析时返回 `null`。
- `toGitUrl(url)`：确保仓库地址带 `.git` 后缀（幂等）。
- `toQuery(object)`：剔除 `undefined` 字段后输出可直接传给 `searchParams` 的对象。
- `isNotModified(value)`：判断返回数据是否由 ETag 缓存复用。
- `isObjectLike(value)`：判定对象-like 值（工具方法，在 HTTP 错误处理等场景使用）。

### API URL & Schema 构建器

包入口导出全部 URL 构建函数与 Zod Schema，覆盖 PR、Issue、Repo、User 四大类资源。例如：

- PR：`listPullsUrl`、`createPullUrl`、`prCommentsUrl`、`pullRequestSettingsUrl`、`createPrCommentUrl`、`prCountUrl` 等。
- Issue：`listIssuesUrl`、`issueCommentsUrl`、`createIssueUrl`、`createIssueCommentUrl`、`getIssueUrl`、`updateIssueUrl` 等。
- Repo：`repoSettingsUrl`、`repoEventsUrl`、`contributorsUrl`、`branchesUrl`、`commitsUrl`、`fileBlobUrl`、`compareUrl`、`webhooksUrl`、`notificationsUrl` 等。
- User：`userProfileUrl`、`userNamespaceUrl`。
- Notification：`notificationSchema`、`notificationsResponseSchema`。

### 类型定义（节选）

- PR：`PullRequest`、`PullRequestSettings`、`PRComment`、`CreatedPrComment`、`PrCount`。
- Issue：`Issue`、`IssueComment`、`CreatedIssue`、`CreatedIssueComment`、`IssueDetail`、`UpdatedIssue`、`UpdatedIssueComment`。
- Repo：`RepoSettings`、`RepoEvents`、`Contributors`、`Branch`、`Branches`、`Commits`、`FileBlob`、`Compare`、`Webhook`、`Webhooks`。
- User：`UserProfile`、`UserNamespace`、`UserSummary`。
- 权限：`SelfPermissionResponse`、`RoleInfo`、`PermissionPoint`、`ResourceNode`、`RepoRole`。
- Notification：`Notification`、`NotificationActor`、`NotificationsResponse`、`NotificationQuery`、`MarkNotificationsReadParams`。

## 模块概览

- `client.pr`：拉取/创建 PR、读取评论、创建评论、读取 PR 设置、统计 PR 数量等。详见《[Pull Requests API](./pr.md)》。
- `client.issue`：列出、读取、创建、更新 Issue 以及管理 Issue 评论。详见《[Issues API](./issue.md)》。
- `client.repo`：仓库权限、设置、事件流、贡献者、分支、提交、文件内容与 Webhook。详见《[仓库 API](./repo.md)》。
- `client.user`：获取当前登录用户资料与命名空间信息。详见《[用户 API](./user.md)》。

## 认证与环境变量

- `GITCODE_TOKEN`：默认读取的访问令牌，可通过 `client.auth.setToken()` 动态覆盖。
- `GITCODE_HTTP_DEBUG`：值为 `1/true/on/debug` 时输出调试日志。
- `GITCODE_HTTP_DEBUG_SHOW_SECRETS`：调试日志中保留授权头。

客户端使用 `Bearer` 头部发送 Token；未提供 Token 时，将以匿名方式访问公开资源。

## 变更记录

- **2025-11-04**：新增仓库通知 API（`getNotifications`、`markNotificationsRead`）。
- **2025-09-17**：HTTP 层迁移至 `got`，新增 ETag 缓存、重试与调试日志；请求选项重命名为 `searchParams`/`json`。
- **2025-09-13**：补全仓库、PR、Issue 相关 API，并以 Zod 校验响应；新增 `client.issue.update()`、`client.pr.createComment()`、`client.pr.count()` 等封装。
- **2025-09-12**：新增 Issue 读写接口与命名空间 API，`parseGitUrl`/`toGitUrl` 暴露给外部使用。
