import type {
  CreateIssueCommentParams,
  CreateIssueParams,
  IssueCommentsQuery,
  ListIssuesQuery,
  UpdateIssueBody,
  UpdateIssueCommentParams,
} from '../../api/issue/index.js';
import type { GitCodeClient } from '../core.js';
import { listIssueComments } from './comments.js';
import { createIssueComment } from './create-comment.js';
import { createIssue } from './create.js';
import { getIssue } from './get.js';
import { listIssues } from './list.js';
import { updateIssueComment } from './update-comment.js';
import { updateIssue } from './update.js';

/**
 * GitCode Issue 客户端模块
 *
 * 提供 Issue 的增删改查操作，包括列表查询、详情获取、创建/更新 Issue、评论管理等功能。
 *
 * @example
 * ```typescript
 * const client = new GitCodeClient(token);
 *
 * // 列出开放的 Issue
 * const issues = await client.issue.list(repoUrl, { state: 'open' });
 *
 * // 创建新 Issue
 * const newIssue = await client.issue.create({
 *   url: repoUrl,
 *   body: { title: 'Bug: something broken', body: 'Description...' },
 * });
 *
 * // 添加评论
 * await client.issue.createComment({
 *   url: repoUrl,
 *   number: 123,
 *   body: { body: 'Thanks for reporting!' },
 * });
 * ```
 */
export class GitCodeClientIssue {
  constructor(private client: GitCodeClient) {}

  /**
   * 列出仓库的 Issues
   *
   * @param url - 仓库地址（支持 HTTPS 或 SSH 格式）
   * @param query - 查询参数
   * @returns Issue 列表响应，包含分页信息
   *
   * @example
   * ```typescript
   * // 获取所有开放的 Issue
   * const openIssues = await client.issue.list(url, { state: 'open' });
   *
   * // 分页获取
   * const issues = await client.issue.list(url, {
   *   state: 'all',
   *   per_page: 50,
   *   page: 2,
   * });
   * ```
   */
  list(url: string, query: ListIssuesQuery = { state: 'open' }) {
    return listIssues(this.client, url, query);
  }

  /**
   * 获取 Issue 的评论列表
   *
   * @param url - 仓库地址
   * @param issueNumber - Issue 编号
   * @param query - 查询参数（分页等）
   * @returns 评论列表
   *
   * @example
   * ```typescript
   * const comments = await client.issue.comments(repoUrl, 123, {
   *   per_page: 20,
   * });
   * ```
   */
  comments(url: string, issueNumber: number, query: IssueCommentsQuery = {}) {
    return listIssueComments(this.client, url, issueNumber, query);
  }

  /**
   * 获取单个 Issue 的详细信息
   *
   * @param url - 仓库地址
   * @param issueNumber - Issue 编号
   * @returns Issue 详情
   * @throws {HttpError} 当 Issue 不存在时抛出 404 错误
   *
   * @example
   * ```typescript
   * const issue = await client.issue.get(repoUrl, 123);
   * console.log(issue.title, issue.state);
   * ```
   */
  get(url: string, issueNumber: number) {
    return getIssue(this.client, url, issueNumber);
  }

  /**
   * 更新 Issue
   *
   * @param url - 仓库地址
   * @param issueNumber - Issue 编号
   * @param body - 更新内容
   * @returns 更新后的 Issue 信息
   *
   * @example
   * ```typescript
   * // 关闭 Issue
   * await client.issue.update(repoUrl, 123, { state: 'closed' });
   *
   * // 修改标题
   * await client.issue.update(repoUrl, 123, { title: 'New title' });
   * ```
   */
  update(url: string, issueNumber: number, body: UpdateIssueBody) {
    return updateIssue(this.client, url, issueNumber, body);
  }

  /**
   * 创建新的 Issue
   *
   * @param params - 创建参数，包含仓库地址和 Issue 内容
   * @returns 创建成功的 Issue 信息
   *
   * @example
   * ```typescript
   * const issue = await client.issue.create({
   *   url: repoUrl,
   *   body: {
   *     title: 'Feature request: dark mode',
   *     body: 'It would be great to have...',
   *     labels: ['enhancement'],
   *   },
   * });
   * ```
   */
  create(params: CreateIssueParams) {
    return createIssue(this.client, params);
  }

  /**
   * 在 Issue 上创建评论
   *
   * @param params - 评论参数，包含仓库地址、Issue 编号和评论内容
   * @returns 创建成功的评论信息
   *
   * @example
   * ```typescript
   * const comment = await client.issue.createComment({
   *   url: repoUrl,
   *   number: 123,
   *   body: { body: 'Thanks for the feedback!' },
   * });
   * ```
   */
  createComment(params: CreateIssueCommentParams) {
    return createIssueComment(this.client, params);
  }

  /**
   * 更新 Issue 评论
   *
   * @param params - 更新参数，包含仓库地址、评论 ID 和新内容
   * @returns 更新后的评论信息
   *
   * @example
   * ```typescript
   * await client.issue.updateComment({
   *   url: repoUrl,
   *   commentId: 456,
   *   body: { body: 'Updated comment content' },
   * });
   * ```
   */
  updateComment(params: UpdateIssueCommentParams) {
    return updateIssueComment(this.client, params);
  }
}

export {
  createIssue,
  createIssueComment,
  getIssue,
  listIssueComments,
  listIssues,
  updateIssue,
  updateIssueComment,
};
