import type {
  CreatedPrComment,
  CreatePullBody,
  ListPullsQuery,
  PRCommentQueryOptions,
  PrCount,
  PullRequestSettings,
} from '../../api/pr/index.js';
import type { GitCodeClient } from '../core.js';
import { listPullRequestComments } from './comments.js';
import { getPullRequestCount } from './count.js';
import { createPrComment } from './create-comment.js';
import { createPullRequest } from './create.js';
import { listPullRequests } from './list.js';
import { getPullRequestSettings } from './settings.js';

export class GitCodeClientPr {
  constructor(private client: GitCodeClient) {}

  list(url: string, query: ListPullsQuery = { state: 'open' }) {
    return listPullRequests(this.client, url, query);
  }

  create(url: string, body: CreatePullBody) {
    return createPullRequest(this.client, url, body);
  }

  comments(url: string, prNumber: number, query?: PRCommentQueryOptions) {
    return listPullRequestComments(this.client, url, prNumber, query);
  }

  async getSettings(owner: string, repo: string): Promise<PullRequestSettings> {
    return await getPullRequestSettings(this.client, owner, repo);
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
