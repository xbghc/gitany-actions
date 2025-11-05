import { z } from 'zod';

/**
 * API 验证错误上下文信息
 */
export interface ApiValidationContext {
  /** API 端点 URL */
  endpoint: string;
  /** HTTP 方法 */
  method?: string;
  /** 请求参数 */
  params?: Record<string, unknown>;
  /** 原始 API 响应数据（用于在错误消息中显示实际值） */
  data?: unknown;
}

/**
 * API 验证错误类
 *
 * 当 GitCode API 返回的数据不符合预期的 Zod schema 时抛出此错误。
 * 提供友好的错误消息和完整的上下文信息，便于调试。
 *
 * @example
 * ```typescript
 * try {
 *   const data = await client.pr.list(url);
 * } catch (error) {
 *   if (error instanceof ApiValidationError) {
 *     console.log('端点:', error.context.endpoint);
 *     console.log('字段错误:', error.getFieldErrors());
 *   }
 * }
 * ```
 */
export class ApiValidationError extends Error {
  /** 原始 Zod 验证错误 */
  public readonly zodError: z.ZodError;

  /** API 请求上下文信息 */
  public readonly context: ApiValidationContext;

  constructor(zodError: z.ZodError, context: ApiValidationContext) {
    // 生成友好的错误消息
    const prettyMessage = ApiValidationError.formatZodError(zodError, context.data);
    const method = context.method || 'GET';
    const message = [
      `API 响应验证失败: ${method} ${context.endpoint}`,
      '',
      prettyMessage,
      '',
      '提示: 这通常表示 GitCode API 返回了意外的数据结构。',
      '     请检查 API 文档或联系 GitCode 支持团队。',
    ].join('\n');

    super(message);
    this.name = 'ApiValidationError';
    this.zodError = zodError;
    this.context = context;

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiValidationError);
    }
  }

  /**
   * 格式化 Zod 错误为友好的字符串
   * @param error Zod 验证错误
   * @param data 原始数据（用于提取实际值）
   */
  private static formatZodError(error: z.ZodError, data?: unknown): string {
    return error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        let message = `  ✖ ${issue.message}\n    → at ${path}`;

        // 尝试从原始数据中提取实际值
        if (data !== undefined) {
          const actualValue = ApiValidationError.extractValue(data, issue.path);
          if (actualValue !== undefined) {
            const formattedValue = ApiValidationError.formatValue(actualValue);
            message += ` (实际值: ${formattedValue})`;
          }
        }

        return message;
      })
      .join('\n');
  }

  /**
   * 根据路径从数据对象中提取值
   * @param data 原始数据
   * @param path 字段路径
   * @returns 提取的值，如果路径无效则返回 undefined
   */
  private static extractValue(data: unknown, path: PropertyKey[]): unknown {
    try {
      let current: any = data;
      for (const key of path) {
        if (current == null) return undefined;
        // 跳过 symbol 类型的键
        if (typeof key === 'symbol') return undefined;
        current = current[key];
      }
      return current;
    } catch {
      return undefined;
    }
  }

  /**
   * 格式化值为易读的字符串
   * @param value 要格式化的值
   * @returns 格式化后的字符串
   */
  private static formatValue(value: unknown): string {
    // null 和 undefined
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    // 基础类型
    if (typeof value === 'string') {
      // 限制字符串长度
      const str = value.length > 50 ? value.substring(0, 50) + '...' : value;
      return `"${str}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    // 数组
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length <= 3) {
        return `[${value.map((v) => ApiValidationError.formatValue(v)).join(', ')}]`;
      }
      return `Array(${value.length})`;
    }

    // 对象
    if (typeof value === 'object') {
      try {
        const json = JSON.stringify(value);
        if (json.length <= 50) return json;
        return json.substring(0, 50) + '...}';
      } catch {
        return '[Object]';
      }
    }

    // 其他类型
    return String(value);
  }

  /**
   * 获取扁平化的字段错误映射
   *
   * @returns 字段路径到错误消息数组的映射
   *
   * @example
   * ```typescript
   * const errors = error.getFieldErrors();
   * // { 'user.login': ['Expected string, received number'] }
   * ```
   */
  getFieldErrors(): Record<string, string[]> {
    const flattened = this.zodError.flatten();
    return flattened.fieldErrors as Record<string, string[]>;
  }

  /**
   * 获取简洁的单行错误摘要
   *
   * @returns 错误摘要字符串
   *
   * @example
   * ```typescript
   * console.log(error.getSummary());
   * // "user.login: Expected string, received number"
   * ```
   */
  getSummary(): string {
    const issues = this.zodError.issues;
    if (issues.length === 0) return 'Unknown validation error';

    if (issues.length === 1) {
      const issue = issues[0];
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    }

    const firstIssue = issues[0];
    const firstPath = firstIssue.path.length > 0 ? firstIssue.path.join('.') : 'root';
    return `${issues.length} validation errors (first: ${firstPath})`;
  }

  /**
   * 获取所有验证错误的详细列表
   *
   * @returns 错误详情数组
   */
  getIssues() {
    return this.zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
  }

  /**
   * 转换为 JSON 格式（用于日志记录或错误追踪）
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      issues: this.getIssues(),
      timestamp: new Date().toISOString(),
    };
  }
}
