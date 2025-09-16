import { createLogger } from '@gitany/shared';

type BinaryLike = ArrayBuffer | NodeJS.ArrayBufferView;

export type HttpRequestParams = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  url: string;
  token?: string;
  options?: HttpRequestOptions;
};

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  body?: unknown;
  /**
   * Number of times to retry the request when the network connection fails.
   * Defaults to 3.
   */
  retries?: number;
}

// Simple in-memory cache for ETag and payload per URL
const etagStore = new Map<string, { etag: string; payload: unknown }>();
const cacheHit = new WeakSet<object>();

/**
 * Whether the provided payload was served from cache (304 Not Modified).
 */
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

function responseHeaders(resp: Response): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, value] of resp.headers.entries()) {
    entries[key] = value;
  }
  return entries;
}

export interface FetchWithRetryOptions {
  retries: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function fetchWithRetries(
  requestUrl: string,
  init: RequestInit,
  options: FetchWithRetryOptions,
): Promise<Response> {
  const { retries, onRetry } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(requestUrl, init);
    } catch (error) {
      if (attempt < retries) {
        onRetry?.(attempt + 1, error);
        continue;
      }
      throw normalizeFetchError(error, requestUrl);
    }
  }
}

function normalizeFetchError(error: unknown, requestUrl: string): unknown {
  if (!(error instanceof Error)) {
    return error;
  }
  const cause = (error as { cause?: unknown }).cause;
  const causeCode =
    typeof cause === 'object' && cause !== null && 'code' in cause
      ? String((cause as { code?: unknown }).code)
      : undefined;
  if (causeCode === 'UND_ERR_CONNECT_TIMEOUT') {
    const details =
      typeof cause === 'object' && cause !== null && 'message' in cause
        ? String((cause as { message?: unknown }).message)
        : 'connection timed out';
    return new Error(`连接 GitCode 服务器超时: ${requestUrl}. ${details}`);
  }
  if (causeCode === 'UND_ERR_HEADERS_TIMEOUT' || causeCode === 'UND_ERR_RESPONSE_TIMEOUT') {
    return new Error(`等待 GitCode 响应超时: ${requestUrl}`);
  }
  return error;
}

function resolveRequestBody(body: unknown, headers: Record<string, string>): RequestInit['body'] | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (body === null) {
    ensureHeader(headers, 'content-type', 'application/json');
    return 'null';
  }

  if (typeof body === 'string') {
    ensureHeader(headers, 'content-type', 'text/plain; charset=UTF-8');
    return body;
  }

  if (typeof body === 'bigint') {
    ensureHeader(headers, 'content-type', 'application/json');
    return body.toString();
  }

  if (typeof body === 'number' || typeof body === 'boolean') {
    ensureHeader(headers, 'content-type', 'application/json');
    return JSON.stringify(body);
  }

  if (isURLSearchParams(body)) {
    ensureHeader(headers, 'content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
    return body;
  }

  if (isFormData(body) || isReadableStream(body)) {
    return body as RequestInit['body'];
  }

  if (isBinaryBody(body) || isBlob(body)) {
    return body as RequestInit['body'];
  }

  if (typeof body === 'object') {
    ensureHeader(headers, 'content-type', 'application/json');
    return JSON.stringify(body);
  }

  ensureHeader(headers, 'content-type', 'text/plain; charset=UTF-8');
  return String(body);
}

function getHeaderKey(headers: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase();
  return Object.keys(headers).find((key) => key.toLowerCase() === target);
}

function ensureHeader(headers: Record<string, string>, name: string, value: string): void {
  const existingKey = getHeaderKey(headers, name);
  if (existingKey) {
    return;
  }
  headers[name] = value;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function isURLSearchParams(value: unknown): value is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams;
}

function isReadableStream(value: unknown): value is ReadableStream<unknown> {
  return typeof ReadableStream !== 'undefined' && value instanceof ReadableStream;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function isBinaryBody(value: unknown): value is BinaryLike {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

function formatBodyForLog(body: unknown): unknown {
  if (body === undefined) {
    return null;
  }
  if (isFormData(body)) {
    return '[form-data]';
  }
  if (isReadableStream(body)) {
    return '[readable-stream]';
  }
  if (isBinaryBody(body) || isBlob(body)) {
    return '[binary-body]';
  }
  return body;
}

export async function httpRequest<T = unknown>(params: HttpRequestParams): Promise<T> {
  const { method, url, token, options } = params;

  const requestUrl = buildUrlWithQuery(url, options?.query);

  const headers: Record<string, string> = {
    ...(options?.headers ?? {}),
  };

  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }

  const cached = etagStore.get(requestUrl);
  if (cached?.etag) {
    headers['if-none-match'] = cached.etag;
  }

  const init: RequestInit = { method, headers };
  const body = resolveRequestBody(options?.body, headers);
  if (body !== undefined) {
    init.body = body;
  }

  logHttp('request', {
    method,
    url: requestUrl,
    headers: redactHeaders(headers),
    body: formatBodyForLog(options?.body),
  });
  const retries = options?.retries ?? 3;
  const resp = await fetchWithRetries(requestUrl, init, {
    retries,
    onRetry: (attempt, error) => {
      logHttp('retry', {
        url: requestUrl,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });

  if (resp.status === 304 && cached) {
    if (typeof cached.payload === 'object' && cached.payload !== null) {
      cacheHit.add(cached.payload as object);
    }
    logHttp('response-cache', {
      method,
      url: requestUrl,
      status: resp.status,
      statusText: resp.statusText,
      headers: responseHeaders(resp),
      body: '[cached payload reused]',
    });
    return cached.payload as T;
  }

  const rawBody = await resp.text().catch(() => '');

  logHttp('response', {
    method,
    url: requestUrl,
    status: resp.status,
    statusText: resp.statusText,
    headers: responseHeaders(resp),
    body: rawBody,
  });

  if (!resp.ok) {
    throw new Error(
      `Gitcode request failed: ${resp.status} ${resp.statusText}${rawBody ? `\n${rawBody}` : ''}`,
    );
  }

  const ct = resp.headers.get('content-type') || '';
  let payload: unknown;
  if (ct.includes('application/json')) {
    payload = rawBody ? JSON.parse(rawBody) : undefined;
  } else {
    payload = rawBody;
  }

  const etag = resp.headers.get('etag');
  if (etag) {
    etagStore.set(requestUrl, { etag, payload });
  }

  return payload as T;
}

function buildUrlWithQuery(url: string, query?: Record<string, string | number | boolean>) {
  if (!query) {
    return url;
  }
  const u = new URL(url);
  Object.entries(query).forEach(([k, v]) => {
    u.searchParams.append(k, String(v));
  });
  return u.toString();
}
