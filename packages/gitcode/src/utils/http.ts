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

const DEFAULT_REQUESTS_PER_MINUTE = 50;
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

const requestsPerMinute = resolveRequestsPerMinute();
const baseIntervalMs = Math.max(Math.ceil(60000 / requestsPerMinute), 1);

type QueueResolver = () => void;

const requestQueue: QueueResolver[] = [];
let processingQueue = false;
let lastDispatchTimestamp = Date.now() - baseIntervalMs;

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

  await waitForThrottleTurn();

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

async function waitForThrottleTurn(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestQueue.push(resolve);
    void runQueue();
  });
}

async function runQueue(): Promise<void> {
  if (processingQueue) {
    return;
  }
  processingQueue = true;
  try {
    while (requestQueue.length > 0) {
      await ensureThrottleWindow();
      lastDispatchTimestamp = Date.now();
      const next = requestQueue.shift();
      next?.();
    }
  } finally {
    processingQueue = false;
    if (requestQueue.length > 0) {
      void runQueue();
    }
  }
}

async function ensureThrottleWindow(): Promise<void> {
  while (true) {
    const queueSize = requestQueue.length;
    const requiredInterval = calculateInterval(queueSize);
    const now = Date.now();
    const elapsed = now - lastDispatchTimestamp;
    const waitTime = requiredInterval - elapsed;
    if (waitTime <= 0) {
      return;
    }
    await sleep(waitTime);
  }
}

function calculateInterval(queueSize: number): number {
  if (queueSize <= 0) {
    return baseIntervalMs;
  }
  const multiplier = Math.floor(queueSize / requestsPerMinute);
  if (multiplier <= 0) {
    return baseIntervalMs;
  }
  const maxMultiplier = Math.max(0, Math.floor(Math.log2(MAX_TIMER_DELAY_MS / baseIntervalMs)));
  const cappedMultiplier = Math.min(multiplier, maxMultiplier);
  const scaled = baseIntervalMs * Math.pow(2, cappedMultiplier);
  return Math.min(scaled, MAX_TIMER_DELAY_MS);
}

function resolveRequestsPerMinute(): number {
  const envValue =
    typeof process !== 'undefined' && process.env ? process.env.GITCODE_API_RPM : undefined;
  if (envValue) {
    const parsed = Number(envValue);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.max(1, Math.floor(parsed));
    }
  }
  return DEFAULT_REQUESTS_PER_MINUTE;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, Math.min(ms, MAX_TIMER_DELAY_MS));
  });
}
