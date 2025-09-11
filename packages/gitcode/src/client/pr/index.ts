import type { GitcodeClient } from '../core';
import { listPullRequests } from './list';
import { createPullRequest } from './create';
import type { ListPullsQuery, CreatePullBody } from '../../api/pr';

export class GitcodeClientPr {
  constructor(private client: GitcodeClient) {}

  list(url: string, query: ListPullsQuery = { state: 'open' }) {
    return listPullRequests(this.client, url, query);
  }

  create(url: string, body: CreatePullBody) {
    return createPullRequest(this.client, url, body);
  }
}
