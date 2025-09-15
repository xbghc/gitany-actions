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

  const resp = await fetch(requestUrl, init);

  if (resp.status === 304 && cached) {
    if (typeof cached.payload === 'object' && cached.payload !== null) {
      cacheHit.add(cached.payload as object);
    }
    return cached.payload as T;
  }

  if (!resp.ok) {
    const text = await safeText(resp);
    throw new Error(
      `Gitcode request failed: ${resp.status} ${resp.statusText}${text ? `\n${text}` : ''}`,
    );
  }

  const ct = resp.headers.get('content-type') || '';
  let payload: unknown;
  if (ct.includes('application/json')) {
    payload = await resp.json();
  } else {
    payload = await resp.text();
  }

  const etag = resp.headers.get('etag');
  if (etag) {
    etagStore.set(requestUrl, { etag, payload });
  }

  return payload as T;
}

async function safeText(resp: Response) {
  try {
    return await resp.text();
  } catch {
    return '';
  }
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
