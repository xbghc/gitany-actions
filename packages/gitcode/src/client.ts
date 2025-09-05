export type AuthStyle = 'query' | 'bearer' | 'token' | 'header';
export type GitcodeClientOptions = {
  baseUrl?: string; // e.g., https://gitcode.com/api/v5
  token?: string | null;
  headers?: Record<string, string>;
  authStyle?: AuthStyle; // default derived from env or 'query'
  customAuthHeader?: string; // header name if authStyle === 'header'
};

export class GitcodeClient {
  private baseUrl: string;
  private token: string | null;
  private extraHeaders: Record<string, string>;
  private authStyle: AuthStyle;
  private customAuthHeader?: string;

  constructor(opts: GitcodeClientOptions = {}) {
    const defaultBase = 'https://gitcode.com/api/v5';
    this.baseUrl = (opts.baseUrl ?? process.env.GITCODE_API_BASE ?? defaultBase).replace(/\/$/, '');
    this.token = opts.token ?? null;
    this.extraHeaders = opts.headers ?? {};
    const envStyle = (process.env.GITCODE_AUTH_STYLE as AuthStyle | undefined) ?? undefined;
    this.authStyle = opts.authStyle ?? envStyle ?? 'query';
    this.customAuthHeader = opts.customAuthHeader ?? process.env.GITCODE_AUTH_HEADER ?? undefined;
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
    // Apply auth
    if (this.token) {
      switch (this.authStyle) {
        case 'query': {
          // Append ?access_token=token
          if (!urlObj.searchParams.has('access_token')) {
            urlObj.searchParams.set('access_token', this.token);
          }
          break;
        }
        case 'header': {
          const headerName = this.customAuthHeader || 'Authorization';
          headers[headerName] = this.token;
          break;
        }
        case 'token': {
          headers['authorization'] = `token ${this.token}`;
          break;
        }
        case 'bearer':
        default: {
          headers['authorization'] = `Bearer ${this.token}`;
          break;
        }
      }
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
