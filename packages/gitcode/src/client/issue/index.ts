import type { GitcodeClient } from '../core.js';
import { listIssues } from './list.js';
import { listIssueComments } from './comments.js';
import { createIssue } from './create.js';
import { createIssueComment } from './create-comment.js';
import { getIssue } from './get.js';
import { updateIssue } from './update.js';
import { updateIssueComment } from './update-comment.js';
import type {
  ListIssuesQuery,
  IssueCommentsQuery,
  CreateIssueParams,
  CreateIssueCommentParams,
  UpdateIssueBody,
  UpdateIssueCommentParams,
} from '../../api/issue/index.js';

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
