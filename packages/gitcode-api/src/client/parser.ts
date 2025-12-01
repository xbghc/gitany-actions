import { z } from 'zod';
import { ApiValidationError, type ApiValidationContext } from './errors.js';

/**
 * API 解析结果类型
 */
export type ApiParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiValidationError };

/**
 * 安全解析 API 响应，返回 Result 类型而不是抛出异常
 *
 * 这个函数使用 Zod 的 safeParse，并将结果包装为统一的 Result 类型，
 * 避免验证失败时程序崩溃。
 *
 * @param schema - Zod schema 定义
 * @param data - 要验证的数据（通常是 API 响应）
 * @param context - API 请求上下文信息
 * @returns Result 类型，包含成功的数据或失败的错误信息
 *
 * @example
 * ```typescript
 * const json = await client.http.get(url).json();
 * const result = safeParseApiResponse(pullRequestSchema, json, {
 *   endpoint: url,
 *   method: 'GET',
 *   params: { state: 'open' },
 * });
 *
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.getSummary());
 * }
 * ```
 */
export function safeParseApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: ApiValidationContext,
): ApiParseResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const error = new ApiValidationError(result.error, {
      ...context,
      data,
    });
    return { success: false, error };
  }

  return { success: true, data: result.data };
}

/**
 * 安全解析 API 响应，失败时抛出友好的 ApiValidationError
 *
 * 这个函数替代了直接使用 `schema.parse()`，提供更好的错误消息和上下文信息。
 * 注意：此函数在验证失败时会抛出异常，如果不希望抛出异常，请使用 `safeParseApiResponse`。
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
  const result = safeParseApiResponse(schema, data, context);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
