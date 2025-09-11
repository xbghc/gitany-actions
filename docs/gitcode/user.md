---
title: 用户 API
---

# 用户 API

## 概述

用户 API 提供获取当前认证用户信息的功能。

## 更新说明

**2025-09-10 更新**: `getUserProfile()` 方法现在返回完整的 `UserProfile` 类型，直接包含所有用户信息字段，无需通过 `raw` 字段访问原始数据。这提供了更丰富的用户信息和更好的类型安全。

## API 方法

### `getUserProfile()`

获取当前认证用户的个人资料信息。

**API 端点**: `GET /api/v5/user`

**返回类型**: `UserProfile` - 完整的用户信息接口，包含丰富的用户资料字段

```typescript
const client = new GitcodeClient({ token: 'your_token' });
const profile = await client.getUserProfile();
console.log(profile);
```

## 类型定义

### `UserProfile`

完整的用户信息接口，包含以下字段：

```typescript
interface UserProfile {
  id: string;           // 用户 ID
  login: string;        // 登录名
  name: string;         // 用户名
  email?: string;       // 邮箱（可选）
  avatar_url: string;   // 头像 URL
  html_url: string;     // 个人主页 URL
  type: string;        // 用户类型
  url: string;          // API URL
  bio?: string;        // 个人简介（可选）
  blog?: string;       // 个人博客（可选）
  company?: string;    // 公司（可选）
  followers: number;   // 关注者数量
  following: number;   // 关注中数量
  top_languages: string[]; // 常用编程语言
}
```

现在直接返回完整的用户信息，无需通过 `raw` 字段访问原始数据。

## 使用示例

### 获取用户信息

```typescript
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient({
  token: process.env.GITCODE_TOKEN,
});

try {
  const profile = await client.getUserProfile();
  console.log('用户信息:', {
    ID: profile.id,
    登录名: profile.login,
    用户名: profile.name,
    邮箱: profile.email,
    头像: profile.avatar_url,
    公司: profile.company,
    关注者: profile.followers,
    关注中: profile.following,
    常用语言: profile.top_languages,
  });
} catch (error) {
  console.error('获取用户信息失败:', error);
}
```

### 结合认证使用

```typescript
import { createGitcodeClient } from '@gitany/gitcode';

const client = await createGitcodeClient();
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