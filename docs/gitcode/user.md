---
title: 用户 API
---

# 用户 API

## 概述

用户 API 提供获取当前认证用户信息的功能。

## API 方法

### `getUserProfile()`

获取当前认证用户的个人资料信息。

**API 端点**: `GET /api/v5/user`

**返回类型**: `RemoteClientUser` - 标准化的用户信息接口，包含 `id`、`name`、`email` 和原始数据 `raw` 字段

```typescript
const client = new GitcodeClient({ token: 'your_token' });
const profile = await client.getUserProfile();
console.log(profile);
```

## 类型定义

### `RemoteClientUser`

标准化的用户信息接口，包含以下字段：

```typescript
interface RemoteClientUser {
  id: string;      // 用户 ID
  name: string;    // 用户名
  email: string;   // 邮箱
  raw: unknown;    // 原始 API 响应数据
}
```

GitCode API 的原始响应数据存储在 `raw` 字段中，可以通过访问该字段获取完整的用户信息。

## 使用示例

### 获取用户信息

```typescript
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient({
  token: process.env.GITCODE_TOKEN,
});

try {
  const profile = await client.getUserProfile();
  console.log('标准化用户信息:', {
    ID: profile.id,
    用户名: profile.name,
    邮箱: profile.email,
  });
  
  // 访问原始 GitCode API 数据
  const rawData = profile.raw as any;
  console.log('详细信息:', {
    登录名: rawData.login,
    头像: rawData.avatar_url,
    公司: rawData.company,
    关注者: rawData.followers,
    关注中: rawData.following,
    常用语言: rawData.top_languages,
  });
} catch (error) {
  console.error('获取用户信息失败:', error);
}
```

### 结合认证使用

```typescript
import { GitcodeAuth } from '@gitany/gitcode';

const auth = new GitcodeAuth();
const client = await auth.client();

const profile = await client.getUserProfile();
console.log('当前用户:', profile.name);
```

## 响应示例

```json
{
  "avatar_url": "https://gitcode.com/u/123/avatar",
  "followers_url": "https://gitcode.com/api/v5/users/123/followers",
  "html_url": "https://gitcode.com/u/123",
  "id": "123",
  "login": "username",
  "name": "用户名",
  "type": "User",
  "url": "https://gitcode.com/api/v5/users/123",
  "bio": "开发者",
  "blog": "https://example.com",
  "company": "公司名称",
  "email": "user@example.com",
  "followers": 42,
  "following": 15,
  "top_languages": ["TypeScript", "JavaScript", "Python"]
}
```

## 错误处理

当请求失败时，会抛出错误。常见的错误情况包括：

- **401 Unauthorized**: Token 无效或过期
- **403 Forbidden**: 权限不足
- **网络错误**: 连接失败或超时

```typescript
try {
  const profile = await client.getUserProfile();
} catch (error) {
  if (error.message.includes('401')) {
    console.error('认证失败，请检查 Token');
  } else {
    console.error('请求失败:', error.message);
  }
}
```