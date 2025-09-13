import type { GitcodeClient } from '../core';
import { listIssues } from './list';
import type { ListIssuesQuery } from '../../api/issue';

export class GitcodeClientIssue {
  constructor(private client: GitcodeClient) {}

  list(url: string, query: ListIssuesQuery = { state: 'open' }) {
    return listIssues(this.client, url, query);
  }
}

export { listIssues };
