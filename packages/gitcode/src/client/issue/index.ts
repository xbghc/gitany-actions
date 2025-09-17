import type { GitcodeClient } from '../core';
import { listIssues } from './list';
import { listIssueComments } from './comments';
import { createIssue } from './create';
import { createIssueComment } from './create-comment';
import { getIssue } from './get';
import { updateIssue } from './update';
import { updateIssueComment } from './update-comment';
import type {
  ListIssuesQuery,
  IssueCommentsQuery,
  CreateIssueParams,
  CreateIssueCommentParams,
  UpdateIssueBody,
  UpdateIssueCommentParams,
} from '../../api/issue';

export class GitcodeClientIssue {
  constructor(private client: GitcodeClient) {}

  list(url: string, query: ListIssuesQuery = { state: 'open' }) {
    return listIssues(this.client, url, query);
  }

  comments(url: string, issueNumber: number, query: IssueCommentsQuery = {}) {
    return listIssueComments(this.client, url, issueNumber, query);
  }

  get(url: string, issueNumber: number) {
    return getIssue(this.client, url, issueNumber);
  }

  update(url: string, issueNumber: number, body: UpdateIssueBody) {
    return updateIssue(this.client, url, issueNumber, body);
  }

  create(params: CreateIssueParams) {
    return createIssue(this.client, params);
  }

  createComment(params: CreateIssueCommentParams) {
    return createIssueComment(this.client, params);
  }

  updateComment(params: UpdateIssueCommentParams) {
    return updateIssueComment(this.client, params);
  }
}

export {
  listIssues,
  listIssueComments,
  createIssue,
  createIssueComment,
  getIssue,
  updateIssue,
  updateIssueComment,
};
