export type GitcodeClientOptions = {
  token?: string | null;
  headers?: Record<string, string>;
};

import { selfPermissionUrl, type SelfPermissionResponse } from '../api/repo/self-permission';
import {
  listPullsUrl,
  type ListPullsQuery,
  type ListPullsResponse,
  createPullUrl,
  type CreatePullBody,
  type PullRequest,
} from '../api/pr';
import { userProfileUrl, type UserProfileResponse } from '../api/user';
import { httpRequest, HttpRequestOptions } from '../utils/http';
import type { RepoRole, RemoteClientUser } from '@gitany/shared';

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
   * Get the normalized permission role for the current user on a repository.
   * Returns one of: 'admin' | 'write' | 'read' | 'none'.
   * - Maps API role_info.cn_name to RepoRole.
   * - Returns 'read' when role_info is missing.
   * - Returns 'none' when repository is not found (HTTP 404).
   */
  async getSelfRepoPermissionRole(owner: string, repo: string): Promise<RepoRole> {
    try {
      const json = await this.getSelfRepoPermission(owner, repo);
      return extractRepoRoleFromSelfPermission(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/\b404\b/.test(msg)) {
        return 'none';
      }
      throw err;
    }
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

  /**
   * Get the current authenticated user's profile.
   * Docs: GET /api/v5/user
   */
  async getUserProfile(): Promise<RemoteClientUser> {
    const url = userProfileUrl();
    const rawProfile = await this.request<UserProfileResponse>(url, 'GET', {});
    
    return {
      id: rawProfile.id,
      name: rawProfile.name,
      email: rawProfile.email || '',
      raw: rawProfile,
    };
  }
}

// SafeText is handled inside utils/http

function extractRepoRoleFromSelfPermission(result: unknown): RepoRole {
  if (result && typeof result === 'object') {
    const obj: any = result;
    const role = obj.role_info || obj.roleInfo;
    if (!role) {
      return 'read';
    }
    const cn = typeof role.cn_name === 'string' ? role.cn_name.trim() : '';
    if (cn.includes('管理员')) return 'admin';
    if (cn.includes('维护者') || cn.includes('开发者')) return 'write';
    return 'read';
  }
  return 'read';
}
