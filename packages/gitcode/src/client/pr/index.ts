import type { GitcodeClient } from '../core';
import { listPullRequests } from './list';
import { createPullRequest } from './create';
import type { ListPullsQuery, CreatePullBody } from '../../api/pr';

export class GitCodeClientPr {
  constructor(private client: GitcodeClient) {}

  list(owner: string, repo: string, query: ListPullsQuery = { state: 'open' }) {
    return listPullRequests(this.client, owner, repo, query);
  }

  create(owner: string, repo: string, body: CreatePullBody) {
    return createPullRequest(this.client, owner, repo, body);
  }
}
