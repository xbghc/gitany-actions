import got, {
  type OptionsOfJSONResponseBody,
  type OptionsOfTextResponseBody,
  type RetryOptions,
  TimeoutError,
  type Hooks,
  type Response,
} from 'got';

import { isObjectLike } from './types.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

export type HttpRequestParams = {
  method: HttpMethod;
  url: string;
  token?: string;
  options?: HttpRequestOptions;
};

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  searchParams?: Record<string, string | number | boolean>;
  json?: unknown;
  body?: OptionsOfTextResponseBody['body'];
  retry?: number | Partial<RetryOptions>;
  responseType?: 'json' | 'text';
}

const http = got.extend({ throwHttpErrors: false });

const defaultRetryOptions = normalizeDefaultRetry();

const etagStore = new Map<string, { etag: string; payload: unknown }>();
const cacheHit = new WeakSet<object>();

// 429 限流管理器
interface RateLimitState {
  isRateLimited: boolean;
  resumeAt: number | null; // Unix timestamp (ms)
}

const rateLimitState: RateLimitState = {
  isRateLimited: false,
  resumeAt: null,
};

export function isNotModified(value: unknown): boolean {
  return isObjectLike(value) && cacheHit.has(value);
}

const httpDebugEnabled = process.env.NODE_ENV === 'development';

function logHttp(event: string, detail: Record<string, unknown>) {
  if (!httpDebugEnabled) return;
  console.debug('[gitcode-api:http]', event, detail);
}

function redactHeaders(headers: Record<string, string>) {
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

export async function httpRequest<T = unknown>(params: HttpRequestParams): Promise<T> {
  const { method, url, token, options } = params;

  // 检查是否处于限流期,如果是则等待
  if (rateLimitState.isRateLimited && rateLimitState.resumeAt) {
    const delayMs = rateLimitState.resumeAt - Date.now();
    if (delayMs > 0) {
      logHttp('rate-limit-wait', {
        method,
        url,
        delayMs,
        resumeAt: new Date(rateLimitState.resumeAt).toISOString(),
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      logHttp('rate-limit-resumed', {
        method,
        url,
      });
    }
    // 时间已到,重置限流状态
    rateLimitState.isRateLimited = false;
    rateLimitState.resumeAt = null;
  }

  const headers = buildHeaders(options?.headers, token);
  const searchParams = options?.searchParams;
  const responseType = options?.responseType ?? 'json';
  const cacheKey = buildCacheKey(method, url, searchParams);
  const cached = etagStore.get(cacheKey);
  if (cached?.etag) {
    headers['if-none-match'] = cached.etag;
  }

  const requestHooks = buildHooks(url);
  const retry = resolveRetry(options?.retry);

  logHttp('request', {
    method,
    url,
    headers: redactHeaders(headers),
    searchParams,
    body: options?.json ?? options?.body ?? null,
  });

  try {
    if (responseType === 'text') {
      const requestOptions: OptionsOfTextResponseBody = {
        method,
        headers,
        searchParams,
        retry,
        hooks: requestHooks,
        isStream: false,
        responseType: 'text',
        ...(options?.json !== undefined ? { json: options.json } : {}),
        ...(options?.body !== undefined ? { body: options.body } : {}),
      };
      const response = await http(url, requestOptions);
      return handleResponse(
        method,
        url,
        cacheKey,
        cached,
        response as Response<string>,
      ) as unknown as T;
    }

    const requestOptions: OptionsOfJSONResponseBody = {
      method,
      headers,
      searchParams,
      retry,
      hooks: requestHooks,
      isStream: false,
      responseType: 'json',
      ...(options?.json !== undefined ? { json: options.json } : {}),
      ...(options?.body !== undefined ? { body: options.body } : {}),
    };
    const response = await http(url, requestOptions);
    return handleResponse(method, url, cacheKey, cached, response as Response<T>);
  } catch (error) {
    throw normalizeGotError(error, url);
  }
}

function buildHeaders(base: Record<string, string> | undefined, token: string | undefined) {
  const headers: Record<string, string> = { ...(base ?? {}) };
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function buildHooks(url: string): Partial<Hooks> | undefined {
  if (!httpDebugEnabled) {
    return undefined;
  }
  return {
    beforeRetry: [
      (error, retryCount) => {
        logHttp('retry', {
          url,
          attempt: retryCount,
          error: error instanceof Error ? error.message : String(error),
        });
      },
    ],
  };
}

function resolveRetry(retry?: HttpRequestOptions['retry']): Partial<RetryOptions> {
  if (retry === undefined) {
    return { ...defaultRetryOptions };
  }
  if (typeof retry === 'number') {
    return { ...defaultRetryOptions, limit: Math.max(0, retry) };
  }
  return {
    ...defaultRetryOptions,
    ...retry,
    limit: Math.max(0, retry.limit ?? defaultRetryOptions.limit ?? 0),
    methods: mergeRetryMethods(retry.methods ?? defaultRetryOptions.methods),
  };
}

function normalizeDefaultRetry(): Partial<RetryOptions> {
  const raw = got.defaults.options.retry;
  if (typeof raw === 'number') {
    return {
      limit: raw,
      methods: mergeRetryMethods(),
    } satisfies Partial<RetryOptions>;
  }
  return {
    ...raw,
    methods: mergeRetryMethods(raw.methods),
  } satisfies Partial<RetryOptions>;
}

function mergeRetryMethods(methods?: RetryOptions['methods']): RetryOptions['methods'] {
  const defaults: RetryOptions['methods'] = ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'];
  const source = methods ?? defaults;
  const next = new Set(source);
  next.add('GET');
  next.add('POST');
  next.add('PUT');
  return Array.from(next) as RetryOptions['methods'];
}

function buildCacheKey(
  method: HttpMethod,
  url: string,
  searchParams: HttpRequestOptions['searchParams'],
): string {
  if (!searchParams || Object.keys(searchParams).length === 0) {
    return `${method} ${url}`;
  }
  const entries = Object.entries(searchParams)
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey === bKey) {
        return aValue.localeCompare(bValue);
      }
      return aKey.localeCompare(bKey);
    });
  const query = entries.map(([key, value]) => `${key}=${value}`).join('&');
  return `${method} ${url}?${query}`;
}

function handleResponse<T>(
  method: HttpMethod,
  url: string,
  cacheKey: string,
  cached: { etag: string; payload: unknown } | undefined,
  response: Response<T>,
): T {
  const normalizedHeaders = normalizeHeaders(response.headers);

  if (response.statusCode === 304 && cached) {
    if (isObjectLike(cached.payload)) {
      cacheHit.add(cached.payload);
    }
    logHttp('response-cache', {
      method,
      url,
      status: response.statusCode,
      statusText: response.statusMessage ?? '',
      headers: normalizedHeaders,
      body: '[cached payload reused]',
    });
    return cached.payload as T;
  }

  logHttp('response', {
    method,
    url,
    status: response.statusCode,
    statusText: response.statusMessage ?? '',
    headers: normalizedHeaders,
    body: response.body,
  });

  // 特殊处理 429 Too Many Requests
  if (response.statusCode === 429) {
    const retryAfter = normalizedHeaders['retry-after'];
    const delayMs = parseRetryAfter(retryAfter);
    const resumeAt = Date.now() + delayMs;

    // 设置全局限流状态
    rateLimitState.isRateLimited = true;
    rateLimitState.resumeAt = resumeAt;

    logHttp('rate-limit-triggered', {
      method,
      url,
      retryAfter: retryAfter ?? '(not provided)',
      delayMs,
      delaySec: Math.round(delayMs / 1000),
      resumeAt: new Date(resumeAt).toISOString(),
      rateLimitRemaining: normalizedHeaders['x-ratelimit-remaining'],
      rateLimitLimit: normalizedHeaders['x-ratelimit-limit'],
      rateLimitReset: normalizedHeaders['x-ratelimit-reset'],
    });

    // 让 got 的重试机制处理这个错误
    const errorBody = stringifyBody(response.body);
    throw new Error(
      `GitCode API 限流 (429 Too Many Requests): 请求将在 ${Math.round(delayMs / 1000)} 秒后重试${
        errorBody ? `\n${errorBody}` : ''
      }`,
    );
  }

  if (response.statusCode >= 400) {
    const errorBody = stringifyBody(response.body);
    throw new Error(
      `Gitcode request failed: ${response.statusCode} ${response.statusMessage ?? ''}${
        errorBody ? `\n${errorBody}` : ''
      }`,
    );
  }

  const etag = normalizedHeaders['etag'];
  if (etag) {
    etagStore.set(cacheKey, { etag, payload: response.body });
  } else if (etagStore.has(cacheKey)) {
    etagStore.delete(cacheKey);
  }

  return response.body as T;
}

function normalizeHeaders(
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
function parseRetryAfter(retryAfter: string | undefined, defaultSeconds = 30): number {
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

function stringifyBody(body: unknown): string {
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

function normalizeGotError(error: unknown, requestUrl: string): Error {
  if (error instanceof TimeoutError) {
    if (error.event === 'request') {
      const details = extractErrorMessage(error) ?? 'connection timed out';
      return new Error(`连接 GitCode 服务器超时: ${requestUrl}. ${details}`);
    }
    return new Error(`等待 GitCode 响应超时: ${requestUrl}`);
  }

  const cause = (error as { cause?: unknown }).cause;
  const code = extractErrorCode(error) ?? extractErrorCode(cause);

  if (code === 'UND_ERR_CONNECT_TIMEOUT') {
    const details = extractErrorMessage(cause) ?? 'connection timed out';
    return new Error(`连接 GitCode 服务器超时: ${requestUrl}. ${details}`);
  }
  if (
    code === 'UND_ERR_HEADERS_TIMEOUT' ||
    code === 'UND_ERR_RESPONSE_TIMEOUT' ||
    code === 'ETIMEDOUT'
  ) {
    return new Error(`等待 GitCode 响应超时: ${requestUrl}`);
  }

  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

function extractErrorCode(value: unknown): string | undefined {
  if (!isObjectLike(value)) {
    return undefined;
  }
  const rawCode = (value as { code?: unknown }).code;
  return typeof rawCode === 'string' ? rawCode : undefined;
}

function extractErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (!isObjectLike(value)) {
    return undefined;
  }
  const message = (value as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}
