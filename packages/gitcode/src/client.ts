export type GitcodeClientOptions = {
  baseUrl?: string; // e.g., https://gitcode.com/api/v5
  token?: string | null;
  headers?: Record<string, string>;
};

const API_BASE = 'https://gitcode.com/api/v5';

import { selfPermissionPath, type SelfPermissionResponse } from './api/self-permission';
import {
  listPullsPath,
  type ListPullsQuery,
  type ListPullsResponse,
  createPullPath,
  type CreatePullBody,
  type PullRequest,
} from './api/pr';
import { httpRequest } from './utils/http';

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
    const url = path.startsWith('http')
      ? path
      : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const method = ((init.method ?? 'GET').toUpperCase()) as 'GET' | 'POST' | 'PUT';
    const headers = {
      ...this.extraHeaders,
      ...(init.headers as Record<string, string> | undefined),
    } as Record<string, string>;
    const body = init.body as string | undefined;

    return await httpRequest<T>({
      method,
      url,
      token: this.token ?? undefined,
      options: { headers, body },
    });
  }

  /**
   * Get the current authenticated user's permission on a repository.
   * Docs: GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission
   */
  async getSelfRepoPermission(owner: string, repo: string): Promise<SelfPermissionResponse> {
    const path = selfPermissionPath({ owner, repo });
    return await this.request(path, { method: 'GET' });
  }

  /**
   * List pull requests for a repository.
   * Docs: GET /api/v5/repos/{owner}/{repo}/pulls
   */
  async listPullRequests(
    owner: string,
    repo: string,
    query?: ListPullsQuery,
  ): Promise<ListPullsResponse> {
    const path = listPullsPath({ owner, repo, query });
    return await this.request(path, { method: 'GET' });
  }

  /**
   * Create a pull request.
   * Docs: POST /api/v5/repos/{owner}/{repo}/pulls
   */
  async createPullRequest(
    owner: string,
    repo: string,
    body: CreatePullBody,
  ): Promise<PullRequest> {
    const path = createPullPath(owner, repo);
    return await this.request(path, { method: 'POST', body: JSON.stringify(body) });
  }
}

// SafeText is handled inside utils/http
