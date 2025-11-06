import type {
  CreatedPrComment,
  CreatePullBody,
  ListPullsQuery,
  PRCommentQueryOptions,
  PrCount,
  PullRequestDetail,
} from '../../api/pr/index.js';
import type { GitCodeClient } from '../core.js';
import { listPullRequestComments } from './comments.js';
import { getPullRequestCount } from './count.js';
import { createPrComment } from './create-comment.js';
import { createPullRequest } from './create.js';
import { getPullRequest } from './get.js';
import { listPullRequests } from './list.js';

export class GitCodeClientPr {
  constructor(private client: GitCodeClient) {}

  list(url: string, query: ListPullsQuery = { state: 'open' }) {
    return listPullRequests(this.client, url, query);
  }

  async get(url: string, prNumber: number): Promise<PullRequestDetail> {
    return await getPullRequest(this.client, url, prNumber);
  }

  create(url: string, body: CreatePullBody) {
    return createPullRequest(this.client, url, body);
  }

  comments(url: string, prNumber: number, query?: PRCommentQueryOptions) {
    return listPullRequestComments(this.client, url, prNumber, query);
  }

  async createComment(url: string, prNumber: number, body: string): Promise<CreatedPrComment> {
    return await createPrComment(this.client, {
      url,
      number: prNumber,
      body: { body },
    });
  }

  async count(url: string): Promise<PrCount> {
    return await getPullRequestCount(this.client, url);
  }
}
