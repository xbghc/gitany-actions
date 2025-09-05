export type GitcodeClientOptions = {
  baseUrl?: string; // e.g., https://gitcode.com/api/v5
  token?: string | null;
  headers?: Record<string, string>;
};

const API_BASE = 'https://gitcode.com/api/v5';

export class GitcodeClient {
  private baseUrl: string;
  private token: string | null;
  private extraHeaders: Record<string, string>;
  

  constructor(opts: GitcodeClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? API_BASE).replace(/\/$/, '');
    this.token = opts.token ?? null;
    this.extraHeaders = opts.headers ?? {};
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token ?? null;
  }

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    // Build URL
    const urlObj = new URL(path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`);

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.extraHeaders,
      ...(init.headers as Record<string, string> | undefined),
    };
    // Apply auth: fixed scheme using Authorization: Bearer <token>
    if (this.token) {
      headers['authorization'] = `Bearer ${this.token}`;
    }

    const resp = await fetch(urlObj, { ...init, headers });
    if (!resp.ok) {
      const text = await safeText(resp);
      throw new Error(`Gitcode request failed: ${resp.status} ${resp.statusText}${text ? `\n${text}` : ''}`);
    }
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return (await resp.json()) as T;
    }
    return (await resp.text()) as unknown as T;
  }
}

async function safeText(resp: Response) {
  try {
    return await resp.text();
  } catch {
    return '';
  }
}
