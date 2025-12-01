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

/**
 * GitCode Pull Request 客户端模块
 *
 * 提供 Pull Request 的增删改查操作，包括列表查询、详情获取、创建 PR、评论管理等功能。
 *
 * @example
 * ```typescript
 * const client = new GitCodeClient(token);
 *
 * // 列出开放的 PR
 * const prs = await client.pr.list(repoUrl, { state: 'open' });
 *
 * // 获取 PR 详情
 * const pr = await client.pr.get(repoUrl, 123);
 *
 * // 创建新 PR
 * const newPr = await client.pr.create(repoUrl, {
 *   title: 'feat: new feature',
 *   source_branch: 'feature-branch',
 *   target_branch: 'main',
 * });
 * ```
 */
export class GitCodeClientPr {
  constructor(private client: GitCodeClient) {}

  /**
   * 列出仓库的 Pull Requests
   *
   * @param url - 仓库地址（支持 HTTPS 或 SSH 格式）
   * @param query - 查询参数
   * @returns PR 列表响应，包含分页信息
   *
   * @example
   * ```typescript
   * // 获取所有开放的 PR
   * const openPrs = await client.pr.list(url, { state: 'open' });
   *
   * // 分页获取所有 PR
   * const allPrs = await client.pr.list(url, {
   *   state: 'all',
   *   per_page: 100,
   *   page: 1,
   * });
   * ```
   */
  list(url: string, query: ListPullsQuery = { state: 'open' }) {
    return listPullRequests(this.client, url, query);
  }

  /**
   * 获取单个 PR 的详细信息
   *
   * @param url - 仓库地址
   * @param prNumber - PR 编号
   * @returns PR 详情，包含完整的合并信息和审查状态
   * @throws {HttpError} 当 PR 不存在时抛出 404 错误
   *
   * @example
   * ```typescript
   * const pr = await client.pr.get(repoUrl, 123);
   * console.log(pr.title, pr.state, pr.merged);
   * ```
   */
  async get(url: string, prNumber: number): Promise<PullRequestDetail> {
    return await getPullRequest(this.client, url, prNumber);
  }

  /**
   * 创建新的 Pull Request
   *
   * @param url - 仓库地址
   * @param body - PR 创建参数
   * @returns 创建成功的 PR 信息
   *
   * @example
   * ```typescript
   * const pr = await client.pr.create(repoUrl, {
   *   title: 'feat: implement new feature',
   *   source_branch: 'feature/awesome',
   *   target_branch: 'main',
   *   description: 'This PR adds...',
   * });
   * ```
   */
  create(url: string, body: CreatePullBody) {
    return createPullRequest(this.client, url, body);
  }

  /**
   * 获取 PR 的评论列表
   *
   * @param url - 仓库地址
   * @param prNumber - PR 编号
   * @param query - 查询参数（分页等）
   * @returns 评论列表
   *
   * @example
   * ```typescript
   * const comments = await client.pr.comments(repoUrl, 123, {
   *   per_page: 50,
   *   page: 1,
   * });
   * ```
   */
  comments(url: string, prNumber: number, query?: PRCommentQueryOptions) {
    return listPullRequestComments(this.client, url, prNumber, query);
  }

  /**
   * 在 PR 上创建评论
   *
   * @param url - 仓库地址
   * @param prNumber - PR 编号
   * @param body - 评论内容（支持 Markdown）
   * @returns 创建成功的评论信息
   *
   * @example
   * ```typescript
   * const comment = await client.pr.createComment(
   *   repoUrl,
   *   123,
   *   'LGTM! :+1:'
   * );
   * ```
   */
  async createComment(url: string, prNumber: number, body: string): Promise<CreatedPrComment> {
    return await createPrComment(this.client, {
      url,
      number: prNumber,
      body: { body },
    });
  }

  /**
   * 获取仓库的 PR 数量统计
   *
   * @param url - 仓库地址
   * @returns PR 数量统计（按状态分类）
   *
   * @example
   * ```typescript
   * const count = await client.pr.count(repoUrl);
   * console.log(`Open: ${count.open}, Merged: ${count.merged}`);
   * ```
   */
  async count(url: string): Promise<PrCount> {
    return await getPullRequestCount(this.client, url);
  }
}
