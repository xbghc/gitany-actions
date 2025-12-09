import { ApiValidationError } from './errors.js';
import { isHttpError, type HttpError } from './http-error.js';

/**
 * API 调用结果类型
 */
export type SafeCallResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiCallError };

/**
 * API 调用错误类型
 */
export type ApiCallError = {
  /** 错误类型 */
  type: 'validation' | 'http' | 'network' | 'unknown';
  /** 错误消息 */
  message: string;
  /** 原始错误对象 */
  cause: unknown;
  /** HTTP 状态码（仅 http 类型错误） */
  statusCode?: number;
  /** 验证错误详情（仅 validation 类型错误） */
  validationError?: ApiValidationError;
};

/**
 * 安全调用 API，返回 Result 类型而不是抛出异常
 *
 * 这个函数包装任何返回 Promise 的 API 调用，捕获所有可能的错误
 * （包括验证错误、HTTP 错误、网络错误等），返回统一的 Result 类型。
 *
 * @param fn - 返回 Promise 的函数（通常是 API 调用）
 * @returns SafeCallResult 类型，包含成功的数据或失败的错误信息
 *
 * @example
 * ```typescript
 * // 安全获取 PR 列表
 * const result = await safeCall(() => client.pr.list(url));
 *
 * if (result.success) {
 *   console.log('PR 数量:', result.data.length);
 * } else {
 *   switch (result.error.type) {
 *     case 'validation':
 *       console.error('API 响应格式错误:', result.error.message);
 *       break;
 *     case 'http':
 *       console.error('HTTP 错误:', result.error.statusCode);
 *       break;
 *     case 'network':
 *       console.error('网络错误:', result.error.message);
 *       break;
 *     default:
 *       console.error('未知错误:', result.error.message);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 在轮询中使用，避免崩溃
 * async function pollPRs() {
 *   const result = await safeCall(() => client.pr.list(url));
 *
 *   if (!result.success) {
 *     logger.warn('获取 PR 列表失败，将在下次轮询重试', result.error);
 *     return; // 优雅处理，不崩溃
 *   }
 *
 *   for (const pr of result.data) {
 *     // 处理 PR...
 *   }
 * }
 * ```
 */
export async function safeCall<T>(fn: () => Promise<T>): Promise<SafeCallResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: classifyError(error) };
  }
}

/**
 * 对错误进行分类
 */
function classifyError(error: unknown): ApiCallError {
  // 验证错误
  if (error instanceof ApiValidationError) {
    return {
      type: 'validation',
      message: error.getSummary(),
      cause: error,
      validationError: error,
    };
  }

  // HTTP 错误
  if (isHttpError(error)) {
    const httpError = error as HttpError;
    return {
      type: 'http',
      message: httpError.message || `HTTP ${httpError.response?.statusCode}`,
      cause: error,
      statusCode: httpError.response?.statusCode,
    };
  }

  // 网络错误（ECONNREFUSED, ETIMEDOUT 等）
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'].includes(code)) {
      return {
        type: 'network',
        message: `网络错误: ${code} - ${error.message}`,
        cause: error,
      };
    }

    // 其他 Error 类型
    return {
      type: 'unknown',
      message: error.message,
      cause: error,
    };
  }

  // 未知错误
  return {
    type: 'unknown',
    message: String(error),
    cause: error,
  };
}

/**
 * 类型守卫：检查 SafeCallResult 是否成功
 */
export function isSuccess<T>(result: SafeCallResult<T>): result is { success: true; data: T } {
  return result.success;
}

/**
 * 类型守卫：检查 SafeCallResult 是否失败
 */
export function isFailure<T>(
  result: SafeCallResult<T>,
): result is { success: false; error: ApiCallError } {
  return !result.success;
}
