import type { GitcodeClient } from '../core';
import { listIssues } from './list';
import { listIssueComments } from './comments';
import type { ListIssuesQuery, IssueCommentsQuery } from '../../api/issue';

export class GitcodeClientIssue {
  constructor(private client: GitcodeClient) {}

  list(url: string, query: ListIssuesQuery = { state: 'open' }) {
    return listIssues(this.client, url, query);
  }

  comments(url: string, issueNumber: number, query: IssueCommentsQuery = {}) {
    return listIssueComments(this.client, url, issueNumber, query);
  }
}

export { listIssues, listIssueComments };
