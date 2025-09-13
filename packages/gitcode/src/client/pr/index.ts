import type { GitcodeClient } from '../core';
import { listPullRequests } from './list';
import { listPullRequestComments } from './comments';
import { createPullRequest } from './create';
import { getPullRequestSettings } from './settings';
import type { ListPullsQuery, CreatePullBody, PRCommentQueryOptions, PullRequestSettings } from '../../api/pr';

export class GitcodeClientPr {
  constructor(private client: GitcodeClient) {}

  list(url: string, query: ListPullsQuery = { state: 'open' }) {
    return listPullRequests(this.client, url, query);
  }

  create(url: string, body: CreatePullBody) {
    return createPullRequest(this.client, url, body);
  }

  comments(url: string, prNumber: number, query?: PRCommentQueryOptions) {
    return listPullRequestComments(this.client, url, prNumber, query);
  }

  async getSettings(owner: string, repo: string): Promise<PullRequestSettings> {
    return await getPullRequestSettings(this.client, owner, repo);
  }
}
