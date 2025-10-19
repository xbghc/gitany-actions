import type { Request, Response, NextFunction } from 'express';

// 扩展 Express Request 类型以包含 gitcodeToken
declare global {
  namespace Express {
    interface Request {
      gitcodeToken?: string;
    }
  }
}

/**
 * 认证中间件
 * - 从请求头中获取 GitCode Token
 * - 生产环境必须提供 TOKEN
 * - 开发环境可以使用默认 TOKEN
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // 从请求头获取 TOKEN（支持多种格式）
  let token =
    req.headers['x-gitcode-token'] as string ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.headers['x-auth-token'] as string;

  // 如果没有提供 TOKEN
  if (!token) {
    // 生产环境必须提供 TOKEN
    if (isProduction) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'GitCode token is required. Please provide token in request header: X-GitCode-Token or Authorization',
      });
      return;
    }

    // 开发环境使用默认 TOKEN（从环境变量）
    const defaultToken = process.env.GITCODE_TOKEN || process.env.DEFAULT_GITCODE_TOKEN;

    if (!defaultToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No GitCode token provided and no default token configured',
      });
      return;
    }

    token = defaultToken;
  }

  // 将 TOKEN 附加到请求对象
  req.gitcodeToken = token;
  next();
}
