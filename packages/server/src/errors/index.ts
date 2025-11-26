/**
 * 自定义错误类
 * 提供结构化的错误处理
 */

/**
 * 应用基础错误类
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    options?: {
      isOperational?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = options?.isOperational ?? true;
    this.context = options?.context;

    // 保持正确的原型链
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.context && { details: this.context }),
    };
  }
}

/**
 * 验证错误 (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', { context });
  }
}

/**
 * 认证错误 (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 授权错误 (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN_ERROR');
  }
}

/**
 * 资源不存在错误 (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier ? `${resource} not found: ${identifier}` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { context: { resource, identifier } });
  }
}

/**
 * 冲突错误 (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT_ERROR', { context });
  }
}

/**
 * 请求频率限制错误 (429)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', { context: { retryAfter } });
    this.retryAfter = retryAfter;
  }
}

/**
 * 外部服务错误 (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, cause?: Error) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      context: { service },
      cause,
    });
  }
}

/**
 * 服务不可用错误 (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * 内部服务器错误 (500)
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error', cause?: Error) {
    super(message, 500, 'INTERNAL_ERROR', { isOperational: false, cause });
  }
}

/**
 * 判断错误是否为已知的应用错误
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * 判断错误是否为操作性错误（可恢复的）
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
