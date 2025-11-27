import type { Request, Response, NextFunction } from 'express';
import { logger, generateRequestId } from '../utils/logger.js';
import { isAppError, isOperationalError, RateLimitError } from '../errors/index.js';

/**
 * 错误响应格式
 */
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  errorId?: string;
  details?: Record<string, unknown>;
}

/**
 * 从请求中获取或生成请求 ID
 */
function getRequestId(req: Request): string {
  return (req.headers['x-request-id'] as string) || generateRequestId();
}

/**
 * 统一错误处理中间件
 *
 * 功能：
 * 1. 区分已知错误和未知错误
 * 2. 结构化日志记录
 * 3. 统一错误响应格式
 * 4. 隐藏内部错误细节（生产环境）
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = getRequestId(req);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 创建带请求上下文的 logger
  const reqLogger = logger.child({
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  // 处理已知的应用错误
  if (isAppError(err)) {
    // 操作性错误使用 warn 级别，非操作性错误使用 error 级别
    if (isOperationalError(err)) {
      reqLogger.warn(
        {
          errorCode: err.code,
          statusCode: err.statusCode,
          context: err.context,
        },
        err.message,
      );
    } else {
      reqLogger.error(
        {
          errorCode: err.code,
          statusCode: err.statusCode,
          context: err.context,
          stack: err.stack,
        },
        err.message,
      );
    }

    const response: ErrorResponse = {
      success: false,
      error: err.code,
      message: err.message,
      ...(err.context && { details: err.context }),
    };

    // Rate limit 错误添加 Retry-After 响应头
    if (err instanceof RateLimitError && err.retryAfter) {
      res.setHeader('Retry-After', err.retryAfter);
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // 处理未知错误
  reqLogger.error(
    {
      errorName: err.name,
      stack: err.stack,
      cause: err.cause,
    },
    `Unhandled error: ${err.message}`,
  );

  // 生产环境隐藏错误细节
  const response: ErrorResponse = {
    success: false,
    error: 'INTERNAL_ERROR',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    errorId: requestId,
  };

  // 开发环境返回更多细节
  if (isDevelopment) {
    response.details = {
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 5),
    };
  }

  res.status(500).json(response);
}

/**
 * 404 错误处理中间件
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = getRequestId(req);

  logger.debug(
    {
      requestId,
      method: req.method,
      path: req.path,
    },
    'Route not found',
  );

  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
  });
}

/**
 * 异步路由包装器
 * 自动捕获 async 函数中的错误并传递给错误处理中间件
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
