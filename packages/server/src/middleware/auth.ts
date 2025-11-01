import type { Request, Response } from 'express';

/**
 * 认证处理器类型
 * - req: Express Request 对象
 * - res: Express Response 对象
 * - token: 已验证的 GitCode Token
 */
type AuthenticatedHandler = (
  req: Request,
  res: Response,
  token: string
) => void | Promise<void>;

/**
 * 从请求中提取 GitCode Token
 */
function extractToken(req: Request): string | null {
  // 从请求头获取 TOKEN（支持多种格式）
  const token =
    req.headers['x-gitcode-token'] as string ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.headers['x-auth-token'] as string;

  return token || null;
}

/**
 * 高阶函数：为路由处理器添加认证功能
 * - 从请求头中获取 GitCode Token
 * - 生产环境必须提供 TOKEN
 * - 开发环境可以使用默认 TOKEN
 *
 * @param handler 需要认证的路由处理器，会接收 token 作为第三个参数
 * @returns Express 路由处理器
 *
 * @example
 * router.get('/path', withAuth(async (req, res, token) => {
 *   const client = createGitcodeClient(token);
 *   // ...
 * }));
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: Request, res: Response): Promise<void> => {
    const isProduction = process.env.NODE_ENV === 'production';

    let token = extractToken(req);

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

    // 调用处理器并传入 token
    await handler(req, res, token);
  };
}
