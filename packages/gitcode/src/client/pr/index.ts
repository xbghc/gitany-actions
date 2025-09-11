import type { GitcodeClient } from '../core';
import { listPullRequests } from './list';
import { listPullRequestComments } from './comments';
import { createPullRequest } from './create';
import type { ListPullsQuery, CreatePullBody, PRCommentQueryOptions } from '../../api/pr';

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
}
