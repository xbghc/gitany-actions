---
title: 仓库 API
---

# 仓库 API

仓库模块聚合了权限、基础信息、事件、分支、提交、文件、对比分支及 Webhook 相关接口。所有响应都由 Zod 校验，以确保字段与 GitCode 返回一致。

## 客户端方法

```ts
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient(process.env.GITCODE_TOKEN);
const repoUrl = 'https://gitcode.com/owner/repo.git';

// 权限
const permission = await client.repo.getSelfRepoPermission(repoUrl);
const role = await client.repo.getSelfRepoPermissionRole(repoUrl);

// 仓库配置与事件
const settings = await client.repo.getSettings('owner', 'repo');
const events = await client.repo.getEvents('owner', 'repo');

// 分支/提交
const branches = await client.repo.getBranches('owner', 'repo');
const branch = await client.repo.getBranch('owner', 'repo', 'main');
const commits = await client.repo.getCommits('owner', 'repo');

// 文件与比较
const blob = await client.repo.getFileBlob('owner', 'repo', 'abc123');
const diff = await client.repo.compare('owner', 'repo', 'main', 'feature');

// Webhook
const hooks = await client.repo.getWebhooks('owner', 'repo');
const hook = await client.repo.getWebhook('owner', 'repo', hooks[0]?.id ?? 0);
```

## 导出与类型

- 权限：`selfPermissionUrl`、`selfPermissionResponseSchema`、`RepoRole` 以及相关类型。
- 仓库配置与事件：`repoSettingsUrl`、`repoEventsUrl`、`repoSettingsSchema`、`repoEventsSchema`。
- 贡献者：`contributorsUrl`、`contributorsSchema`。
- 分支：`branchesUrl`、`branchUrl`、`branchSchema`。
- 提交：`commitsUrl`、`commitSchema`。
- 文件：`fileBlobUrl`、`fileBlobSchema`。
- 对比：`compareUrl`、`compareSchema`。
- Webhook：`webhooksUrl`、`webhookUrl`、`webhookSchema`。

所有 Schema 均可通过包入口引用，以复用在自定义客户端中。

## 选项与返回值

- `client.repo.getSelfRepoPermission(url): SelfPermissionResponse` — 解析远程地址（HTTP/SSH/`owner/repo`）并返回完整权限树。
- `client.repo.getSelfRepoPermissionRole(url): RepoRole` — 在权限树基础上提取归一化角色（`'admin' | 'write' | 'read' | 'none'`）。
- `client.repo.getSettings(owner, repo): RepoSettings` — 默认分支、合并策略、CI 等配置。
- `client.repo.getEvents(owner, repo): RepoEvents` — 仓库事件时间线。
- `client.repo.getContributors(owner, repo): Contributors` — 贡献者数组，包含提交次数与用户信息。
- `client.repo.getBranches(owner, repo): Branches` — 所有分支信息（数组）。
- `client.repo.getBranch(owner, repo, branch): Branch` — 指定分支的提交、保护状态等细节。
- `client.repo.getCommits(owner, repo): Commits` — 最近提交列表。
- `client.repo.getFileBlob(owner, repo, sha): FileBlob` — Git blob 内容（base64 编码及大小）。
- `client.repo.compare(owner, repo, base, head): Compare` — 提交比较详情（含 `files`、`commits` 等）。
- `client.repo.getWebhooks(owner, repo): Webhooks` — 仓库所有 Webhook。
- `client.repo.getWebhook(owner, repo, id): Webhook` — 指定 Webhook 详情。

## 注意事项

- 权限方法接受完整仓库 URL、`owner/repo` 或 `.git` 结尾地址，内部会调用 `parseGitUrl` 统一解析。
- `getCommits`、`getEvents` 等接口直接返回 GitCode API 的原始分页结果（按默认分页大小）。如需更多数据，可自行拼接 `searchParams` 配合 `client.request` 与 URL 构建器使用。
- `getFileBlob` 返回的 `content` 经过 base64 编码，需自行解码。

## 更新记录

- **2025-09-13**：新增仓库事件、分支、提交、文件、对比与 Webhook 等接口封装。
- **2025-09-17**：所有请求支持 `searchParams`/`json` 选项并复用 HTTP 调试日志、重试机制。
