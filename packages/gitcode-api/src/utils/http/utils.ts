export const httpDebugEnabled = process.env.NODE_ENV === 'development';

export function logHttp(event: string, detail: Record<string, unknown>) {
  if (!httpDebugEnabled) return;
  console.debug('[gitcode-api:http]', event, detail);
}

export function redactHeaders(headers: Record<string, string>) {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      sanitized[key] = '<redacted>';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(', ');
    } else if (value !== undefined) {
      normalized[key.toLowerCase()] = value;
    }
  }
  return normalized;
}

/**
 * 解析 Retry-After 响应头,返回延迟的毫秒数
 * 支持两种格式:
 * 1. 整数秒数: "Retry-After: 30"
 * 2. HTTP 日期: "Retry-After: Wed, 21 Oct 2025 07:28:00 GMT"
 *
 * @param retryAfter - Retry-After 响应头的值
 * @param defaultSeconds - 如果解析失败,使用的默认秒数
 * @returns 延迟的毫秒数
 */
export function parseRetryAfter(retryAfter: string | undefined, defaultSeconds = 30): number {
  if (!retryAfter) {
    return defaultSeconds * 1000;
  }

  // 尝试解析为整数秒数
  const seconds = Number(retryAfter);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  // 尝试解析为 HTTP 日期
  const date = new Date(retryAfter);
  if (!Number.isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    // 确保延迟时间为正数,至少 1 秒
    return Math.max(delayMs, 1000);
  }

  // 解析失败,使用默认值
  logHttp('retry-after-parse-failed', {
    retryAfter,
    defaultSeconds,
  });
  return defaultSeconds * 1000;
}

export function stringifyBody(body: unknown): string {
  if (body === undefined || body === null) {
    return '';
  }
  if (typeof body === 'string') {
    return body;
  }
  try {
    return JSON.stringify(body);
  } catch (error) {
    console.warn('[gitcode-api:http] Failed to stringify body, falling back to String()', error);
    return String(body);
  }
}
