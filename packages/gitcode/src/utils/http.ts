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

export async function httpRequest<T = unknown>(params: HttpRequestParams): Promise<T> {
  const { method, url, token, options } = params;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(options?.headers ?? {}),
  };

  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };
  if (options?.body !== undefined) {
    init.body = options.body;
  }

  const resp = await fetch(buildUrlWithQuery(url, options?.query), init);
  if (!resp.ok) {
    const text = await safeText(resp);
    throw new Error(
      `Gitcode request failed: ${resp.status} ${resp.statusText}${text ? `\n${text}` : ''}`,
    );
  }
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await resp.json()) as T;
  }
  return (await resp.text()) as unknown as T;
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
