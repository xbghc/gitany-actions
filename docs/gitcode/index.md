---
title: gitcode 工具库
---

# @gitany/gitcode（工具库）

提供 GitCode API 访问与认证封装，以及 Git 远程地址解析工具。

包路径：`packages/gitcode`

## 导出内容

- `parseGitUrl(url: string): Remote | null`
  - 解析 `https://gitcode.com/owner/repo(.git)` 或 `git@gitcode.com:owner/repo(.git)` 这类 URL。
- `GitcodeClient`
  - 轻量 HTTP 客户端，内置鉴权处理。
- `GitcodeAuth`
  - 本地令牌存储与加载，提供 `login/logout/status/client`。
- `FileAuthStorage`、`defaultConfigPath()`

## 认证与请求

默认 API 基址：`https://gitcode.com/api/v5`

支持四种认证风格（env `GITCODE_AUTH_STYLE` 或在构造时指定）：

- `bearer`：`Authorization: Bearer <token>`（默认）
- `query`：在 URL 上追加 `?access_token=<token>`
- `token`：`Authorization: token <token>`
- `header`：自定义请求头（配合 `customAuthHeader` / env `GITCODE_AUTH_HEADER`）

环境变量：

- `GITCODE_API_BASE`：API 基址（默认 `https://gitcode.com/api/v5`）
- `GITCODE_TOKEN`：令牌（优先级高于磁盘存储）
- `GITCODE_AUTH_STYLE`：`query|bearer|token|header`
- `GITCODE_AUTH_HEADER`：当使用 `header` 风格时的请求头名
- `GITCODE_WHOAMI_PATH`：鉴权验证路径（默认 `/user`）

### GitcodeAuth 用法

```ts
import { GitcodeAuth } from '@gitany/gitcode';

const auth = new GitcodeAuth();
await auth.login('your_token', 'https://gitcode.com/api/v5', 'bearer');

const { authenticated, user } = await auth.status(); // 尝试 GET /user
console.log(authenticated, user);

const client = await auth.client();
const me = await client.request('/user');
```

默认本地存储路径：`~/.gitany/gitcode/config.json`

### GitcodeClient 用法

```ts
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient({
  baseUrl: 'https://gitcode.com/api/v5',
  token: process.env.GITCODE_TOKEN ?? null,
  authStyle: 'bearer', // 或 'query' | 'token' | 'header'
  customAuthHeader: undefined, // 当 authStyle 为 header 时生效
});

// 获取当前用户
const me = await client.request('/user');

// 其它请求：client.request<T>(path, init)
```

## Git URL 解析

```ts
import { parseGitUrl } from '@gitany/gitcode';

parseGitUrl('https://gitcode.com/owner/repo.git');
// => { host: 'gitcode.com', owner: 'owner', repo: 'repo' }

parseGitUrl('git@gitcode.com:owner/repo.git');
// => { host: 'gitcode.com', owner: 'owner', repo: 'repo' }
```
