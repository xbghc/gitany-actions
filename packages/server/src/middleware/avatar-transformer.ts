import type { Request, Response, NextFunction } from 'express';
import { isValidGitCodeImageUrl } from '../constants/allowed-domains.js';

/**
 * 将 GitCode CDN 头像 URL 转换为本地代理 URL
 * @param originalUrl - 原始 GitCode CDN URL
 * @returns 代理 URL 或原始 URL（如果不是有效的 GitCode URL）
 */
function transformAvatarUrl(originalUrl: string): string {
  if (!originalUrl || typeof originalUrl !== 'string') {
    return originalUrl;
  }

  if (!isValidGitCodeImageUrl(originalUrl)) {
    return originalUrl;
  }

  return `/api/avatar-proxy?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * 递归遍历对象/数组，转换所有 avatar_url 字段
 * @param data - 要处理的数据（可以是对象、数组或原始值）
 * @returns 转换后的数据
 */
function transformAvatarUrlsRecursive(data: any): any {
  // 处理 null 和 undefined
  if (data == null) {
    return data;
  }

  // 处理数组
  if (Array.isArray(data)) {
    return data.map(item => transformAvatarUrlsRecursive(item));
  }

  // 处理对象
  if (typeof data === 'object') {
    const transformed: any = {};

    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        continue;
      }

      const value = data[key];

      // 如果是 avatar_url 字段且值是字符串，进行转换
      if (key === 'avatar_url' && typeof value === 'string') {
        transformed[key] = transformAvatarUrl(value);
      } else {
        // 递归处理嵌套的对象/数组
        transformed[key] = transformAvatarUrlsRecursive(value);
      }
    }

    return transformed;
  }

  // 原始值直接返回
  return data;
}

/**
 * Express 中间件：自动转换响应中的所有 avatar_url 字段为代理 URL
 *
 * 使用方式：
 * ```typescript
 * app.use(avatarTransformerMiddleware);
 * ```
 *
 * 该中间件会拦截所有响应，递归查找并转换其中的 avatar_url 字段。
 * 支持处理：
 * - 顶层 avatar_url 字段
 * - 嵌套对象中的 avatar_url（如 response.data.user.avatar_url）
 * - 数组中的 avatar_url（如 response.data.assignees[].avatar_url）
 */
export function avatarTransformerMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // 保存原始的 res.json 方法
  const originalJson = res.json.bind(res);

  // 重写 res.json 方法
  res.json = function (body: any) {
    // 如果响应数据存在，进行转换
    if (body != null) {
      body = transformAvatarUrlsRecursive(body);
    }

    // 调用原始的 json 方法发送响应
    return originalJson(body);
  };

  next();
}
