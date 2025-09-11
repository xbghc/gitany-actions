export type GitcodeClientOptions = {
  token?: string | null;
  headers?: Record<string, string>;
};

import { httpRequest, type HttpRequestOptions } from '../utils/http';
import { GitCodeClientUser } from './user';
import { createPrModule } from './pr';
import { GitCodeClientRepo } from './repo';
import type { ListPullsQuery, CreatePullBody } from '../api/pr';

export class GitcodeClient {
  private token: string | null;

  pr = createPrModule(this);
  repo = new GitCodeClientRepo(this);
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
}
