import type { Response } from 'got';
import { isObjectLike } from '../types.js';
import type { HttpRequestParams } from './types.js';
import { rateLimitManager } from './rate-limit.js';
import { etagStore, cacheHit, buildCacheKey } from './cache.js';
import { buildHeaders, buildRequestOptions, buildHooks, resolveRetry, http } from './config.js';
import { normalizeGotError } from './error.js';
import {
  logHttp,
  redactHeaders,
  normalizeHeaders,
  parseRetryAfter,
  stringifyBody,
} from './utils.js';

export async function httpRequest<T = unknown>(params: HttpRequestParams): Promise<T> {
  return rateLimitManager.schedule(async () => {
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

    logHttp('request', {
      method,
      url,
      headers: redactHeaders(headers),
      searchParams,
      body: options?.json ?? options?.body ?? null,
    });

    try {
      const requestOptions = buildRequestOptions(
        method,
        headers,
        searchParams,
        retry,
        requestHooks,
        responseType,
        options,
      );

      const response = await http(url, requestOptions);

      if (responseType === 'text') {
        return handleResponse(
          method,
          url,
          cacheKey,
          cached,
          response as Response<string>,
        ) as unknown as T;
      }

      return handleResponse(method, url, cacheKey, cached, response as Response<T>);
    } catch (error) {
      throw normalizeGotError(error, url);
    }
  });
}

function handleResponse<T>(
  method: string,
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

    logHttp('rate-limit-triggered', {
      method,
      url,
      retryAfter: retryAfter ?? '(not provided)',
      delayMs,
      delaySec: Math.round(delayMs / 1000),
      resumeAt: new Date(Date.now() + delayMs).toISOString(),
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
