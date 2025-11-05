import got, {
  type OptionsOfJSONResponseBody,
  type OptionsOfTextResponseBody,
  type RetryOptions,
  type Hooks,
} from 'got';
import type { HttpMethod, HttpRequestOptions } from './types.js';
import { logHttp, httpDebugEnabled } from './utils.js';

export const http = got.extend({ throwHttpErrors: false });

const defaultRetryOptions = normalizeDefaultRetry();

export function buildHeaders(base: Record<string, string> | undefined, token: string | undefined) {
  const headers: Record<string, string> = { ...(base ?? {}) };
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 构建 got 请求配置对象
 * 统一处理 JSON 和 Text 响应类型的配置
 */
export function buildRequestOptions(
  method: HttpMethod,
  headers: Record<string, string>,
  searchParams: Record<string, string | number | boolean> | undefined,
  retry: Partial<RetryOptions>,
  hooks: Partial<Hooks> | undefined,
  responseType: 'json' | 'text',
  options?: HttpRequestOptions,
): OptionsOfJSONResponseBody | OptionsOfTextResponseBody {
  const baseOptions = {
    method,
    headers,
    searchParams,
    retry,
    hooks,
    isStream: false as const,
    responseType,
  };

  // 条件性添加 json 或 body 属性
  if (options?.json !== undefined) {
    return { ...baseOptions, json: options.json };
  }
  if (options?.body !== undefined) {
    return { ...baseOptions, body: options.body };
  }

  return baseOptions;
}

export function buildHooks(url: string): Partial<Hooks> | undefined {
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

export function resolveRetry(retry?: HttpRequestOptions['retry']): Partial<RetryOptions> {
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
