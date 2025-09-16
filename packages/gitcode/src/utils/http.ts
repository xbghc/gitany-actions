import { createLogger } from '@gitany/shared';
import pThrottle, { type ThrottledFunction } from 'p-throttle';

export type HttpRequestParams = {
  method: 'GET' | 'POST' | 'PUT';
  url: string;
  token?: string;
  options?: HttpRequestOptions;
};

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  body?: string;
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

const httpDebugFlag = process.env.GITCODE_HTTP_DEBUG || process.env.GITANY_HTTP_DEBUG || '';
const httpDebugEnabled = ['1', 'true', 'yes', 'on', 'debug']
  .includes(httpDebugFlag.trim().toLowerCase());
const httpDebugShowSensitiveFlag = process.env.GITCODE_HTTP_DEBUG_SHOW_SECRETS || '';
const httpDebugShowSensitive = ['1', 'true', 'yes', 'on']
  .includes(httpDebugShowSensitiveFlag.trim().toLowerCase());

const httpLogger = createLogger('@gitany/gitcode:http');

const DEFAULT_REQUESTS_PER_MINUTE = 50;
const THROTTLE_INTERVAL_MS = 60_000;
const requestsPerMinute = resolveRequestsPerMinute();
const scheduleFetch = createRateLimitedFetcher(requestsPerMinute);

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

export async function httpRequest<T = unknown>(params: HttpRequestParams): Promise<T> {
  const { method, url, token, options } = params;

  const requestUrl = buildUrlWithQuery(url, options?.query);

  const headers: Record<string, string> = {
    'content-type': 'application/json',
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
  if (options?.body !== undefined) {
    init.body = options.body;
  }

  logHttp('request', {
    method,
    url: requestUrl,
    headers: redactHeaders(headers),
    body: options?.body ?? null,
  });
  const retries = options?.retries ?? 3;
  let resp: Response;
  for (let attempt = 0; ; attempt++) {
    try {
      resp = await scheduleFetch(requestUrl, init);
      break;
    } catch (error) {
      if (attempt < retries) {
        logHttp('retry', {
          url: requestUrl,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (error instanceof Error) {
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
          throw new Error(`连接 GitCode 服务器超时: ${requestUrl}. ${details}`);
        }
        if (causeCode === 'UND_ERR_HEADERS_TIMEOUT' || causeCode === 'UND_ERR_RESPONSE_TIMEOUT') {
          throw new Error(`等待 GitCode 响应超时: ${requestUrl}`);
        }
      }
      throw error;
    }
  }

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

function resolveRequestsPerMinute(): number {
  const raw = process.env.GITCODE_API_RPM;
  if (!raw) {
    return DEFAULT_REQUESTS_PER_MINUTE;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REQUESTS_PER_MINUTE;
  }
  return parsed;
}

export interface HttpRateLimiterStats {
  queueSize: number;
  limit: number;
  intervalMs: number;
  requestsPerMinute: number;
}

export function getHttpRateLimiterStats(): HttpRateLimiterStats {
  return {
    queueSize: scheduleFetch.queueSize,
    limit: Math.max(1, Math.floor(requestsPerMinute)),
    intervalMs: THROTTLE_INTERVAL_MS,
    requestsPerMinute,
  };
}

function createRateLimitedFetcher(
  rpm: number,
): ThrottledFunction<[string, RequestInit], Response> {
  const limit = Math.max(1, Math.floor(rpm));
  const throttle = pThrottle({
    limit,
    interval: THROTTLE_INTERVAL_MS,
  });

  return throttle((url: string, init: RequestInit) => fetch(url, init));
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
