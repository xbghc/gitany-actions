---
title: 仓库 API
---

# 仓库 API

## 概述

仓库 API 提供获取仓库设置、分支、提交历史、贡献者、文件内容和 Webhooks 等功能。

## 更新说明

**2025-09-13 更新**: 新增完整的仓库管理 API，包括设置、分支、提交、贡献者、文件操作和 Webhooks 管理功能。

## API 方法

### `getSettings(owner, repo)`

获取仓库设置信息。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/repo_settings`

**返回类型**: `RepoSettings`

```typescript
const client = new GitcodeClient();
const settings = await client.repo.getSettings('owner', 'repo');
console.log(settings.default_branch);
```

### `getEvents(owner, repo)`

获取仓库的活动事件。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/events`

**返回类型**: `RepoEvent[]`

```typescript
const client = new GitcodeClient();
const events = await client.repo.getEvents('owner', 'repo');
events.forEach((event) => {
  console.log(event.type, event.actor.login);
});
```

### `getBranches(owner, repo)`

获取仓库所有分支信息。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/branches`

**返回类型**: `Branch[]`

```typescript
const client = new GitcodeClient();
const branches = await client.repo.getBranches('owner', 'repo');
branches.forEach((branch) => {
  console.log(branch.name, branch.default);
});
```

### `getBranch(owner, repo, branch)`

获取特定分支的详细信息。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/branches/{branch}`

**返回类型**: `Branch`

```typescript
const client = new GitcodeClient();
const branch = await client.repo.getBranch('owner', 'repo', 'main');
console.log(branch.commit.id);
```

### `getCommits(owner, repo)`

获取仓库提交历史。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/commits`

**返回类型**: `Commit[]`

```typescript
const client = new GitcodeClient();
const commits = await client.repo.getCommits('owner', 'repo');
commits.forEach((commit) => {
  console.log(commit.sha, commit.commit.message);
});
```

### `getContributors(owner, repo)`

获取仓库贡献者列表。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/contributors`

**返回类型**: `Contributor[]`

```typescript
const client = new GitcodeClient();
const contributors = await client.repo.getContributors('owner', 'repo');
contributors.forEach((contributor) => {
  console.log(contributor.name, contributor.contributions);
});
```

### `getFileBlob(owner, repo, sha)`

获取文件内容。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/git/blobs/{sha}`

**返回类型**: `FileBlob`

```typescript
const client = new GitcodeClient();
const fileBlob = await client.repo.getFileBlob('owner', 'repo', 'abc123');
console.log(fileBlob.content, fileBlob.encoding);
```

### `compare(owner, repo, base, head)`

比较两个分支或提交之间的差异。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/compare/{base}...{head}`

**返回类型**: `Compare`

```typescript
const client = new GitcodeClient();
const comparison = await client.repo.compare('owner', 'repo', 'main', 'feature');
console.log(comparison.files.length);
```

### `getWebhooks(owner, repo)`

获取仓库所有 Webhooks。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/hooks`

**返回类型**: `Webhook[]`

```typescript
const client = new GitcodeClient();
const webhooks = await client.repo.getWebhooks('owner', 'repo');
webhooks.forEach((webhook) => {
  console.log(webhook.url, webhook.active);
});
```

### `getWebhook(owner, repo, id)`

获取特定的 Webhook 信息。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/hooks/{id}`

**返回类型**: `Webhook`

```typescript
const client = new GitcodeClient();
const webhook = await client.repo.getWebhook('owner', 'repo', 123);
console.log(webhook.config);
```

### `getSelfRepoPermission(url)`

获取当前认证用户在指定仓库的权限。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission`

**返回类型**: `SelfPermissionResponse`

```typescript
const client = new GitcodeClient();
// URL can be a full repo URL or just 'owner/repo'
const permission = await client.repo.getSelfRepoPermission('owner/repo');
console.log(permission.role_name, permission.permissions);
```

### `getSelfRepoPermissionRole(url)`

获取当前认证用户在指定仓库的角色名称。

**API 端点**: `GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission`

**返回类型**: `RepoRole` (string enum)

```typescript
const client = new GitcodeClient();
const role = await client.repo.getSelfRepoPermissionRole('owner/repo');
console.log('User role:', role); // e.g., 'admin', 'write', 'read'
```

## 类型定义

### `RepoSettings`

仓库设置信息：

```typescript
interface RepoSettings {
  default_branch?: string;
  has_issues?: boolean;
  has_wiki?: boolean;
  has_pull_requests?: boolean;
  has_projects?: boolean;
  allow_squash_merge?: boolean;
  allow_merge_commit?: boolean;
  allow_rebase_merge?: boolean;
  delete_branch_on_merge?: boolean;
}
```

### `Branch`

分支信息：

```typescript
interface Branch {
  name: string;
  commit: {
    id: string;
    message: string;
    parent_ids: string[];
    authored_date: string;
    author_name: string;
    author_iam_id: string | null;
    author_email: string;
    author_user_name: string | null;
    committed_date: string;
    committer_name: string;
    committer_email: string;
    committer_user_name: string | null;
    open_gpg_verified: any | null;
    verification_status: any | null;
    gpg_primary_key_id: any | null;
    short_id: string;
    created_at: string;
    title: string;
    author_avatar_url: string;
    committer_avatar_url: string;
    relate_url: string | null;
  };
  merged: boolean;
  protected: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
  default: boolean;
}
```

### `Commit`

提交信息：

```typescript
interface Commit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
      email: string;
    };
    committer: {
      name: string;
      date: string;
      email: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
  };
  author: {
    name: string;
    id: number;
    login: string;
    type: string;
  };
  committer: {
    name: string;
    id: number;
    login: string;
    type: string;
  };
  html_url: string;
  url: string;
}
```

### `Contributor`

贡献者信息：

```typescript
interface Contributor {
  name: string;
  contributions: number;
  email: string;
}
```

### `FileBlob`

文件内容信息：

```typescript
interface FileBlob {
  sha: string;
  size: number;
  url: string;
  content: string;
  encoding: string;
}
```

### `Compare`

代码比较结果：

```typescript
interface Compare {
  base_commit: Commit;
  merge_base_commit: Commit;
  commits: Commit[];
  files: CompareFile[];
  truncated: number;
}

interface CompareFile {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  patch?: string;
  truncated: number;
}
```

### `Webhook`

Webhook 配置信息：

```typescript
interface Webhook {
  id: number;
  url: string;
  test_url: string;
  ping_url: string;
  name: string;
  events: string[];
  active: boolean;
  config: {
    url: string;
    content_type: string;
    secret?: string;
    insecure_ssl: string;
  };
  updated_at: string;
  created_at: string;
  last_response?: {
    code: any | null;
    status: string;
    message: string;
  };
}
```

## 使用示例

### 获取仓库基本信息

```typescript
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();

// 获取仓库设置
const settings = await client.repo.getSettings('myorg', 'myrepo');
console.log('默认分支:', settings.default_branch);

// 获取分支列表
const branches = await client.repo.getBranches('myorg', 'myrepo');
console.log('分支数量:', branches.length);

// 获取最新提交
const commits = await client.repo.getCommits('myorg', 'myrepo');
if (commits.length > 0) {
  console.log('最新提交:', commits[0].commit.message);
}
```

### 获取仓库贡献者

```typescript
const contributors = await client.repo.getContributors('myorg', 'myrepo');
console.log('贡献者统计:');
contributors.forEach((contributor) => {
  console.log(`  ${contributor.name}: ${contributor.contributions} 次提交`);
});
```

### 比较分支差异

```typescript
const comparison = await client.repo.compare('myorg', 'myrepo', 'main', 'feature');
console.log(`发现 ${comparison.files.length} 个文件变更`);
comparison.files.forEach((file) => {
  console.log(`  ${file.filename}: +${file.additions} -${file.deletions}`);
});
```

### 管理 Webhooks

```typescript
const webhooks = await client.repo.getWebhooks('myorg', 'myrepo');
console.log(`仓库有 ${webhooks.length} 个 Webhooks`);

if (webhooks.length > 0) {
  const webhook = await client.repo.getWebhook('myorg', 'myrepo', webhooks[0].id);
  console.log('第一个 Webhook:', webhook.url);
}
```

## 响应示例

### 仓库设置响应

```json
{
  "default_branch": "main",
  "has_issues": true,
  "has_wiki": false,
  "has_pull_requests": true,
  "has_projects": true,
  "allow_squash_merge": true,
  "allow_merge_commit": true,
  "allow_rebase_merge": true,
  "delete_branch_on_merge": false
}
```

### 分支列表响应

```json
[
  {
    "name": "main",
    "commit": {
      "id": "abc123...",
      "message": "Initial commit",
      "author_name": "John Doe",
      "author_email": "john@example.com",
      "authored_date": "2024-01-15T10:30:00Z"
    },
    "default": true,
    "protected": true
  }
]
```

## 错误处理

```typescript
try {
  const branches = await client.repo.getBranches('nonexistent', 'repo');
} catch (error) {
  if (error.message.includes('404')) {
    console.error('仓库不存在');
  } else {
    console.error('获取仓库信息失败:', error);
  }
}
```
