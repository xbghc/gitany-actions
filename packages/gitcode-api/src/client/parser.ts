import { z } from 'zod';
import { ApiValidationError, type ApiValidationContext } from './errors.js';

/**
 * 安全解析 API 响应，失败时抛出友好的 ApiValidationError
 *
 * 这个函数替代了直接使用 `schema.parse()`，提供更好的错误消息和上下文信息。
 *
 * @param schema - Zod schema 定义
 * @param data - 要验证的数据（通常是 API 响应）
 * @param context - API 请求上下文信息
 * @returns 验证后的类型安全数据
 * @throws {ApiValidationError} 当数据不符合 schema 时
 *
 * @example
 * ```typescript
 * const json = await client.http.get(url).json();
 * return parseApiResponse(pullRequestSchema, json, {
 *   endpoint: url,
 *   method: 'GET',
 *   params: { state: 'open' },
 * });
 * ```
 */
export function parseApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: ApiValidationContext,
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    // 将原始数据添加到 context 中，以便在错误消息中显示实际值
    throw new ApiValidationError(result.error, {
      ...context,
      data,
    });
  }

  return result.data;
}
