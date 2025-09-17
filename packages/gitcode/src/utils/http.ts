import got, {
  type OptionsInit,
  type OptionsOfJSONResponseBody,
  type OptionsOfTextResponseBody,
  type RetryOptions,
  TimeoutError,
  type Hooks,
  type Response,
} from 'got';

import { createLogger } from '@gitany/shared';

export type HttpMethod = 'GET' | 'POST' | 'PUT';

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

export function isNotModified(value: unknown): boolean {
  return typeof value === 'object' && value !== null && cacheHit.has(value as object);
}

const httpDebugFlag = process.env.GITCODE_HTTP_DEBUG ?? '';
const httpDebugEnabled = ['1', 'true', 'yes', 'on', 'debug']
  .includes(httpDebugFlag.trim().toLowerCase());
const httpDebugShowSensitiveFlag = process.env.GITCODE_HTTP_DEBUG_SHOW_SECRETS || '';
const httpDebugShowSensitive = ['1', 'true', 'yes', 'on']
  .includes(httpDebugShowSensitiveFlag.trim().toLowerCase());

const httpLogger = createLogger('@gitany/gitcode:http');

function logHttp(event: string, detail: Record<string, unknown>) {
  if (!httpDebugEnabled) return;
  httpLogger.info({ event, detail }, 'gitcode http debug');
}

function redactHeaders(headers: Record<string, string>) {
  if (httpDebugEnabled && httpDebugShowSensitive) {
    return { ...headers };
  }
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

  const commonOptions: OptionsInit = {
    method,
    headers,
    searchParams,
    retry,
  };

  if (requestHooks) {
    commonOptions.hooks = requestHooks;
  }

  if (options?.json !== undefined) {
    commonOptions.json = options.json;
  }

  if (options?.body !== undefined) {
    commonOptions.body = options.body;
  }

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
        ...commonOptions,
        responseType: 'text',
      };
      const response = await http<string>(url, requestOptions);
      return handleResponse(method, url, cacheKey, cached, response) as unknown as T;
    }

    const requestOptions: OptionsOfJSONResponseBody = {
      ...commonOptions,
      responseType: 'json',
    };
    const response = await http<T>(url, requestOptions);
    return handleResponse(method, url, cacheKey, cached, response);
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
    if (typeof cached.payload === 'object' && cached.payload !== null) {
      cacheHit.add(cached.payload as object);
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

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
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

function stringifyBody(body: unknown): string {
  if (body === undefined || body === null) {
    return '';
  }
  if (typeof body === 'string') {
    return body;
  }
  try {
    return JSON.stringify(body);
  } catch {
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
  if (code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'UND_ERR_RESPONSE_TIMEOUT' || code === 'ETIMEDOUT') {
    return new Error(`等待 GitCode 响应超时: ${requestUrl}`);
  }

  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

function extractErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const rawCode = (value as { code?: unknown }).code;
  return typeof rawCode === 'string' ? rawCode : undefined;
}

function extractErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const message = (value as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}
