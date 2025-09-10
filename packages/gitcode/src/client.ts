export type GitcodeClientOptions = {
  token?: string | null;
  headers?: Record<string, string>;
};

import { selfPermissionUrl, type SelfPermissionResponse } from './api/self-permission';
import {
  listPullsUrl,
  type ListPullsQuery,
  type ListPullsResponse,
  createPullUrl,
  type CreatePullBody,
  type PullRequest,
} from './api/pr';
import { httpRequest, HttpRequestOptions } from './utils/http';

export class GitcodeClient {
  private token: string | null;
  private extraHeaders: Record<string, string>;

  constructor(opts: GitcodeClientOptions = {}) {
    this.token = opts.token ?? null;
    this.extraHeaders = opts.headers ?? {};
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token ?? null;
  }

  async request<T = unknown>(
    url: string,
    method: 'GET' | 'POST' | 'PUT',
    options?: HttpRequestOptions,
  ): Promise<T> {
    return await httpRequest<T>({
      method,
      url,
      token: this.token ?? undefined,
      options,
    });
  }

  /**
   * Get the current authenticated user's permission on a repository.
   * Docs: GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission
   */
  async getSelfRepoPermission(owner: string, repo: string): Promise<SelfPermissionResponse> {
    const path = selfPermissionUrl({ owner, repo });
    return await this.request(path, 'GET', {});
  }

  /**
   * List pull requests for a repository.
   * Docs: GET /api/v5/repos/{owner}/{repo}/pulls
   */
  async listPullRequests(
    owner: string,
    repo: string,
    prQuery: ListPullsQuery = { state: 'open' },
  ): Promise<ListPullsResponse> {
    const path = listPullsUrl(owner, repo);

    const query: Record<string, string | number | boolean> = {};
    for(const [k, v] of Object.entries(prQuery)) {
      if(v !== undefined) {
        query[k] = v;
      }
    }

    return await this.request(path, 'GET', { query });
  }

  /**
   * Create a pull request.
   * Docs: POST /api/v5/repos/{owner}/{repo}/pulls
   */
  async createPullRequest(owner: string, repo: string, body: CreatePullBody): Promise<PullRequest> {
    const url = createPullUrl(owner, repo);
    return await this.request(url, 'POST', { body: JSON.stringify(body) });
  }
}

// SafeText is handled inside utils/http
