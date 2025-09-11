export type GitcodeClientOptions = {
  token?: string | null;
  headers?: Record<string, string>;
};

import { httpRequest, type HttpRequestOptions } from '../utils/http';
import { GitCodeClientUser } from './user';
import { createPrModule } from './pr';
import { createRepoModule } from './repo';
import type { ListPullsQuery, ListPullsResponse, CreatePullBody, PullRequest } from '../api/pr';
import type { SelfPermissionResponse } from '../api/repo/self-permission';
import type { RepoRole } from '../types/repo-role';
import type { UserProfile } from '../api/user';

export class GitcodeClient {
  private token: string | null;

  pr = createPrModule(this);
  repo = createRepoModule(this);
  user = new GitCodeClientUser(this);

  constructor(opts: GitcodeClientOptions = {}) {
    this.token = opts.token ?? null;
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

  // Backward compatible wrappers

  async getSelfRepoPermission(owner: string, repo: string): Promise<SelfPermissionResponse> {
    return await this.repo.getSelfRepoPermission(owner, repo);
  }

  async getSelfRepoPermissionRole(owner: string, repo: string): Promise<RepoRole> {
    return await this.repo.getSelfRepoPermissionRole(owner, repo);
  }

  async listPullRequests(
    owner: string,
    repo: string,
    prQuery: ListPullsQuery = { state: 'open' },
  ): Promise<ListPullsResponse> {
    return await this.pr.list(owner, repo, prQuery);
  }

  async createPullRequest(
    owner: string,
    repo: string,
    body: CreatePullBody,
  ): Promise<PullRequest> {
    return await this.pr.create(owner, repo, body);
  }

  async getUserProfile(): Promise<UserProfile> {
    return await this.user.getProfile();
  }
}
