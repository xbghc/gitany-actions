import { httpRequest, type HttpRequestOptions } from '../utils/http/index.js';
import { GitcodeClientUser } from './user/index.js';
import { GitcodeClientPr } from './pr/index.js';
import { GitcodeClientRepo } from './repo/index.js';
import { GitcodeClientIssue } from './issue/index.js';
import { GitcodeClientAuth } from './auth/index.js';

export class GitcodeClient {
  pr = new GitcodeClientPr(this);
  repo = new GitcodeClientRepo(this);
  issue = new GitcodeClientIssue(this);
  user = new GitcodeClientUser(this);
  auth: GitcodeClientAuth;

  constructor(token?: string) {
    this.auth = new GitcodeClientAuth(this, token);
  }

  async request<T = unknown>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    options?: HttpRequestOptions,
  ): Promise<T> {
    return await httpRequest<T>({
      method,
      url,
      token: this.auth.token() ?? undefined,
      options,
    });
  }
}
