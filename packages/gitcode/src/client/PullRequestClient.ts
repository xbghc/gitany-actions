import type { GitcodeClient } from './core';
import { toQuery } from '../utils';

// Type imports
import type {
  ListPullsQuery,
  ListPullsResponse,
  CreatePullBody,
  PullRequest,
  PRComment,
  PRCommentQueryOptions,
  CreatedPrComment,
  PullRequestSettings,
} from '../api/pr';
import type { CreatePrCommentParams } from '../api/pr/create-comment';

// Value imports
import { listPullsUrl, listPullsResponseSchema } from '../api/pr/list';
import { createPullUrl } from '../api/pr/create';
import { prCommentsUrl, prCommentSchema } from '../api/pr/comments';
import { createPrCommentUrl, createdPrCommentSchema } from '../api/pr/create-comment';
import { pullRequestSettingsUrl, pullRequestSettingsSchema } from '../api/pr/settings';

export class PullRequestClient {
  constructor(private readonly client: GitcodeClient) {}

  async list(params: {
    owner: string;
    repo: string;
    query?: ListPullsQuery;
  }): Promise<ListPullsResponse> {
    const { owner, repo, query = { state: 'open' } } = params;
    const apiUrl = listPullsUrl(owner, repo);
    const q: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) {
        q[k] = v;
      }
    }
    const json = await this.client.request(apiUrl, 'GET', { searchParams: q });
    return listPullsResponseSchema.parse(json);
  }

  async create(params: {
    owner: string;
    repo: string;
    body: CreatePullBody;
  }): Promise<PullRequest> {
    const { owner, repo, body } = params;
    const apiUrl = createPullUrl(owner, repo);
    return await this.client.request(apiUrl, 'POST', { json: body });
  }

  async listComments(params: {
    owner: string;
    repo: string;
    prNumber: number;
    query?: PRCommentQueryOptions;
  }): Promise<PRComment[]> {
    const { owner, repo, prNumber, query } = params;
    const apiUrl = prCommentsUrl(owner, repo, prNumber);
    const q = toQuery(query);
    const json = await this.client.request(apiUrl, 'GET', { searchParams: q });
    return prCommentSchema.array().parse(json);
  }

  async createComment(params: CreatePrCommentParams): Promise<CreatedPrComment> {
    const { owner, repo, number, body } = params;
    const url = createPrCommentUrl(owner, repo, number);
    const response = await this.client.request(url, 'POST', {
      json: body,
    });
    return createdPrCommentSchema.parse(response);
  }

  async getSettings(params: { owner: string; repo: string }): Promise<PullRequestSettings> {
    const { owner, repo } = params;
    const url = pullRequestSettingsUrl(owner, repo);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return pullRequestSettingsSchema.parse(data);
  }
}
