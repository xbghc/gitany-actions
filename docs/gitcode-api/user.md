---
title: 用户 API
---

# 用户 API

`@xbghc/gitcode-api` 的用户模块提供获取当前认证用户资料与命名空间的封装，所有响应都会通过 Zod 进行结构校验。

## 快速开始

```ts
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient(process.env.GITCODE_TOKEN);
const profile = await client.user.getProfile();
const namespace = await client.user.getNamespace();

console.log('当前登录用户:', profile.login, '命名空间:', namespace.path);
```

- 若未在构造函数中提供 Token，可调用 `client.auth.setToken('token')`。
- 用户端点默认使用 `Bearer` 鉴权。

## API 方法

### `client.user.getProfile()`

- **端点**：`GET /api/v5/user`
- **返回值**：`UserProfile`
- **说明**：返回完整的用户资料（包含 `login`、`name`、`email?`、`company?`、`top_languages` 等字段）。

```ts
const profile = await client.user.getProfile();
console.log(profile.name, profile.followers);
```

### `client.user.getNamespace()`

- **端点**：`GET /api/v5/user/namespace`
- **返回值**：`UserNamespace`
- **说明**：返回当前用户命名空间的路径、名称、类型等信息，常用于组织 Git 仓库路径。

```ts
const namespace = await client.user.getNamespace();
console.log(namespace.id, namespace.path);
```

## 类型定义

### `UserProfile`

```ts
interface UserProfile {
  id: string;
  login: string;
  name: string;
  email?: string;
  avatar_url: string;
  html_url: string;
  type: string;
  url: string;
  bio?: string;
  blog?: string;
  company?: string;
  followers: number;
  following: number;
  top_languages: string[];
}
```

### `UserNamespace`

```ts
interface UserNamespace {
  id: number;
  path: string;
  name: string;
  html_url: string;
  type: string;
}
```

## 错误处理

- 未提供或提供错误的 Token 时将得到 `401 Unauthorized`。
- 网络异常会被归一化，例如连接/响应超时分别提示 “连接 GitCode 服务器超时” 与 “等待 GitCode 响应超时”。
- 其他 HTTP 错误会保留原始状态码与响应正文，便于排查。

```ts
try {
  const profile = await client.user.getProfile();
  console.log(profile.login);
} catch (error) {
  console.error('获取用户信息失败:', (error as Error).message);
}
```

## 更新记录

- **2025-09-13**：新增 `client.user.getNamespace()` 并为所有响应引入 Zod 校验。
- **2025-09-10**：`client.user.getProfile()` 返回完整字段集合而非嵌套原始响应。
