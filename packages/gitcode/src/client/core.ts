import { httpRequest, type HttpRequestOptions } from '../utils/http';
import { UserClient } from './UserClient';
import { PullRequestClient } from './PullRequestClient';
import { RepoClient } from './RepoClient';
import { IssueClient } from './IssueClient';
import { GitcodeClientAuth } from './auth';

export class GitcodeClient {
  pulls = new PullRequestClient(this);
  repo = new RepoClient(this);
  issues = new IssueClient(this);
  user = new UserClient(this);
  auth = new GitcodeClientAuth(this);

  constructor() {}

  async request<T = unknown>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    options?: HttpRequestOptions,
  ): Promise<T> {
    return await httpRequest<T>({
      method,
      url,
      token: (await this.auth.token()) ?? undefined,
      options,
    });
  }
}
