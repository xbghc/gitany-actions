import type { GitcodeClient } from './core';

// Type imports
import type {
  ListIssuesQuery,
  ListIssuesResponse,
  IssueComment,
  IssueCommentsQuery,
  CreatedIssue,
  CreateIssueParams,
  UpdateIssueBody,
  UpdatedIssue,
  CreateIssueCommentParams,
  CreatedIssueComment,
  UpdateIssueCommentParams,
  UpdatedIssueComment,
  IssueDetail,
} from '../api/issue';

// Value imports
import { listIssuesUrl, listIssuesResponseSchema } from '../api/issue/list';
import { getIssueUrl, issueDetailSchema } from '../api/issue/get';
import { createIssueUrl, createdIssueSchema } from '../api/issue/create';
import { updateIssueUrl, updatedIssueSchema } from '../api/issue/update';
import { issueCommentsUrl, issueCommentSchema } from '../api/issue/comments';
import { createIssueCommentUrl, createdIssueCommentSchema } from '../api/issue/create-comment';
import { updateIssueCommentUrl, updatedIssueCommentSchema } from '../api/issue/update-comment';

export class IssueClient {
  constructor(private readonly client: GitcodeClient) {}

  async list(params: {
    owner: string;
    repo: string;
    query?: ListIssuesQuery;
  }): Promise<ListIssuesResponse> {
    const { owner, repo, query = { state: 'open' } } = params;
    const apiUrl = listIssuesUrl(owner, repo);
    const q: Record<string, string | number | boolean> = {
      sort: 'updated',
    };
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) {
        q[k] = v;
      }
    }
    const json = await this.client.request(apiUrl, 'GET', { searchParams: q });
    return listIssuesResponseSchema.parse(json);
  }

  async get(params: { owner: string; repo: string; issueNumber: number }): Promise<IssueDetail> {
    const { owner, repo, issueNumber } = params;
    const apiUrl = getIssueUrl(owner, repo, issueNumber);
    const json = await this.client.request(apiUrl, 'GET');
    return issueDetailSchema.parse(json);
  }

  async create(params: CreateIssueParams): Promise<CreatedIssue> {
    const url = createIssueUrl(params.owner);
    const response = await this.client.request(url, 'POST', {
      json: params.body,
    });
    return createdIssueSchema.parse(response);
  }

  async update(params: {
    owner: string;
    repo: string;
    issueNumber: number;
    body: UpdateIssueBody;
  }): Promise<UpdatedIssue> {
    const { owner, repo, issueNumber, body } = params;
    const apiUrl = updateIssueUrl(owner, repo, issueNumber);
    const json = await this.client.request(apiUrl, 'PATCH', { json: body });
    return updatedIssueSchema.parse(json);
  }

  async listComments(params: {
    owner: string;
    repo: string;
    issueNumber: number;
    query?: IssueCommentsQuery;
  }): Promise<IssueComment[]> {
    const { owner, repo, issueNumber, query = {} } = params;
    const apiUrl = issueCommentsUrl(owner, repo, issueNumber);
    const q: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) {
        q[k] = v;
      }
    }
    const json = await this.client.request(apiUrl, 'GET', { searchParams: q });
    return issueCommentSchema.array().parse(json);
  }

  async createComment(params: CreateIssueCommentParams): Promise<CreatedIssueComment> {
    const url = createIssueCommentUrl(params.owner, params.repo, params.number);
    const response = await this.client.request(url, 'POST', {
      json: params.body,
    });
    return createdIssueCommentSchema.parse(response);
  }

  async updateComment(params: UpdateIssueCommentParams): Promise<UpdatedIssueComment> {
    const url = updateIssueCommentUrl(params.owner, params.repo, params.comment_id);
    const response = await this.client.request(url, 'PATCH', {
      json: params.body,
    });
    return updatedIssueCommentSchema.parse(response);
  }
}
