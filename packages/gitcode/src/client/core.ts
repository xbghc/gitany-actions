import { httpRequest, type HttpRequestOptions } from '../utils/http';
import { GitcodeClientUser } from './user';
import { GitcodeClientPr } from './pr';
import { GitcodeClientRepo } from './repo';
import { GitcodeClientAuth } from './auth';

export class GitcodeClient {
  pr = new GitcodeClientPr(this);
  repo = new GitcodeClientRepo(this);
  user = new GitcodeClientUser(this);
  auth = new GitcodeClientAuth(this);

  constructor() {
  }

  async request<T = unknown>(
    url: string,
    method: 'GET' | 'POST' | 'PUT',
    options?: HttpRequestOptions,
  ): Promise<T> {
    return await httpRequest<T>({
      method,
      url,
      token: await this.auth.token() ?? undefined,
      options,
    });
  }
}
