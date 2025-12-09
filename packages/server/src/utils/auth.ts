import type { Request } from 'express';

/**
 * 从请求中提取 GitCode Token
 * 支持以下三种方式：
 * 1. X-GitCode-Token 请求头
 * 2. Authorization: Bearer <token> 请求头
 * 3. X-Auth-Token 请求头
 *
 * 开发环境下，如果没有提供 token，会使用环境变量中的 GITCODE_TOKEN
 */
export function getTokenFromRequest(req: Request): string | null {
  // 1. X-GitCode-Token header
  const gitcodeToken = req.headers['x-gitcode-token'] as string | undefined;
  if (gitcodeToken) {
    return gitcodeToken;
  }

  // 2. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // 3. X-Auth-Token header
  const authToken = req.headers['x-auth-token'] as string | undefined;
  if (authToken) {
    return authToken;
  }

  // 开发环境下使用环境变量
  if (process.env.NODE_ENV !== 'production') {
    return process.env.GITCODE_TOKEN || null;
  }

  return null;
}
