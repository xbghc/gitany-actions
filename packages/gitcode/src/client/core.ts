export type GitcodeClientOptions = {
  token?: string | null;
  headers?: Record<string, string>;
};

import { httpRequest, type HttpRequestOptions } from '../utils/http';
import { GitcodeClientUser } from './user';
import { GitcodeClientPr } from './pr';
import { GitcodeClientRepo } from './repo';
import { GitcodeClientAuth } from './auth';

export class GitcodeClient {
  private token: string | null;

  pr = new GitcodeClientPr(this);
  repo = new GitcodeClientRepo(this);
  user = new GitcodeClientUser(this);
  auth = new GitcodeClientAuth(this);

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
