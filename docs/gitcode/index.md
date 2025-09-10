---
title: gitcode 工具库
---

# @gitany/gitcode（工具库）

提供 [GitCode API](https://docs.gitcode.com/docs/apis/) 访问与认证封装，以及 Git 远程地址解析工具。

包路径：`packages/gitcode`

## 导出内容

- `parseGitUrl(url: string): Remote | null`
  - 解析 `https://gitcode.com/owner/repo(.git)` 或 `git@gitcode.com:owner/repo(.git)` 这类 URL。
- `GitcodeClient`
  - 轻量 HTTP 客户端，内置鉴权处理。
  - `getSelfRepoPermissionRole(owner, repo)`：获取权限并归一化为 `admin | write | read | none`。
  - `listPullRequests(owner, repo, query?)`：获取仓库的 Pull Request 列表。
  - `createPullRequest(owner, repo, body)`：创建 Pull Request（支持字段：`title`、`head`、`base`、`body`、`issue`）。
- `GitcodeAuth`
  - 本地令牌存储与加载，提供 `setToken/token/status/client`。
- `FileAuthStorage`、`defaultConfigPath()`

更多 API：

- Pull Requests：见《[Pull Requests API](./pr.md)》。

## 公共类型

- `Remote`: 解析 Git 远程地址后的结果（`owner`、`repo`、`host?`）。
- `RepoRole`: 仓库权限归一化结果，`'admin' | 'write' | 'read' | 'none'`。
- `SelfPermissionResponse`: 当前用户在仓库的权限树响应；相关类型：`RoleInfo`、`PermissionPoint`、`ResourceNode`。
- `ListPullsQuery`: PR 列表查询参数（常用：`state`、`page`、`per_page`、`head`、`base`、`sort`、`direction`）。
- `ListPullsParams`: PR 列表路径参数（`owner`、`repo`、`query?`）。
- `PullRequest`: PR 的最小字段表示（`id`、`number?`、`title?`、`state?` 等）。
- `ListPullsResponse`: `PullRequest[]`。
- `CreatePullBody`: 创建 PR 的字段（`title?`、`head?`、`base?`、`body?`、`issue?`）。

## 认证与请求

默认 API 基址：`https://gitcode.com/api/v5`，客户端固定使用请求头鉴权：

- `Authorization: Bearer <token>`

环境变量：

- `GITCODE_TOKEN`：令牌（优先级高于磁盘存储）
- `GITCODE_WHOAMI_PATH`：鉴权验证路径（默认 `/user`）

**Token 读取优先级**：
1. 环境变量 `GITCODE_TOKEN`
2. 本地配置文件 `~/.gitany/gitcode/config.json`

### GitcodeAuth 用法

```ts
import { GitcodeAuth } from '@gitany/gitcode';

const auth = new GitcodeAuth();
await auth.setToken('your_token', 'bearer');

const token = await auth.token(); // 获取token（环境变量优先）
console.log(token);

const { authenticated, user } = await auth.status(); // 尝试 GET /user
console.log(authenticated, user);

const client = await auth.client();
const me = await client.request('/user', 'GET');
```

默认本地存储路径：`~/.gitany/gitcode/config.json`

### GitcodeClient 用法

```ts
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient({
  token: process.env.GITCODE_TOKEN ?? null,
});

// 获取当前用户
const me = await client.request('/user', 'GET');

// 其它请求：client.request<T>(url, method, options?)

// 获取当前用户在某仓库的权限（GET /repos/{owner}/{repo}/collaborators/self-permission）
const perm = await client.getSelfRepoPermission('owner', 'repo');

// 获取 PR 列表（GET /repos/{owner}/{repo}/pulls）
const pulls = await client.listPullRequests('owner', 'repo', { state: 'open', page: 1, per_page: 20 });

// 创建 PR（POST /repos/{owner}/{repo}/pulls）
const pr = await client.createPullRequest('owner', 'repo', {
  title: '修复登录异常',
  head: 'feat/login-fix',
  base: 'main',
  body: '补充说明：修复 Token 过期报错',
  // 可选：关联 issue
  issue: 123,
});
```

## Git URL 解析

```ts
import { parseGitUrl } from '@gitany/gitcode';

parseGitUrl('https://gitcode.com/owner/repo.git');
// => { host: 'gitcode.com', owner: 'owner', repo: 'repo' }

parseGitUrl('git@gitcode.com:owner/repo.git');
// => { host: 'gitcode.com', owner: 'owner', repo: 'repo' }
```

## 变更说明

- 内部已统一使用 `utils/http.ts` 的 `httpRequest` 进行网络请求，实现 URL 构建、头部合并、鉴权与错误处理的集中管理；对外 API 与行为不变。
