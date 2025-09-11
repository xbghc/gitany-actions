import type { GitcodeClient } from '../core';
import { listPullRequests } from './list';
import { createPullRequest } from './create';
import type { ListPullsQuery, CreatePullBody } from '../../api/pr';

export function createPrModule(client: GitcodeClient) {
  return {
    list: (owner: string, repo: string, query: ListPullsQuery = { state: 'open' }) =>
      listPullRequests(client, owner, repo, query),
    create: (owner: string, repo: string, body: CreatePullBody) =>
      createPullRequest(client, owner, repo, body),
  };
}

export { listPullRequests, createPullRequest };
