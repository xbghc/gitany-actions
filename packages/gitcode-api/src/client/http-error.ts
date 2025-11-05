/**
 * HTTP 错误响应结构
 *
 * 表示来自 HTTP 客户端（如 got）的错误响应信息
 */
export interface HttpErrorResponse {
  /**
   * HTTP 状态码（如 404, 429, 500 等）
   */
  statusCode: number;

  /**
   * HTTP 响应头
   */
  headers?: Record<string, string | string[]>;
}

/**
 * 带 HTTP 响应信息的错误
 *
 * 通常由 HTTP 客户端抛出，包含详细的响应信息
 */
export interface HttpError extends Error {
  /**
   * HTTP 响应信息（如果有）
   */
  response?: HttpErrorResponse;
}

/**
 * 类型守卫：检查错误是否为 HTTP 错误
 *
 * @param error - 待检查的错误对象
 * @returns 如果是 HttpError 返回 true
 *
 * @example
 * ```ts
 * try {
 *   await client.pr.list(url);
 * } catch (error) {
 *   if (isHttpError(error) && error.response?.statusCode === 429) {
 *     console.log('Rate limited');
 *   }
 * }
 * ```
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && 'response' in error;
}
