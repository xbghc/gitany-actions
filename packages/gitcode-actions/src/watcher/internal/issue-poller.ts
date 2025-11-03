import type {
  GitcodeClient,
  Issue,
  IssueComment,
  ListIssuesQuery,
  IssueCommentsQuery,
} from '@xbghc/gitcode-api';
import { isNotModified } from '@xbghc/gitcode-api';
import type { EmitFn, PollContext } from './resource-runner.js';

/**
 * Issue 状态定义
 */
export type IssueState = {
  lastCommentByIssue: Map<number, Set<number>>;
};

/**
 * Issue 轮询选项
 */
export interface IssuePollerOptions {
  issueQuery?: ListIssuesQuery;
  commentQuery?: IssueCommentsQuery;
}

/**
 * 获取 Issue 初始状态
 */
export function getInitialIssueState(): IssueState {
  return {
    lastCommentByIssue: new Map(),
  };
}

/**
 * Issue 轮询主函数
 *
 * @param state - 当前状态
 * @param context - 轮询上下文
 * @param emit - 事件发射函数
 * @param options - 轮询选项
 * @returns 新状态
 */
export async function pollIssues(
  state: IssueState,
  context: PollContext,
  emit: EmitFn,
  options: IssuePollerOptions = {},
): Promise<IssueState> {
  // 获取 Issue 列表
  const issues = await fetchIssues(context.client, context.url, options.issueQuery);

  // 检测新评论
  const newLastCommentIds = await detectNewComments(
    issues,
    state.lastCommentByIssue,
    context.client,
    context.url,
    emit,
    options.commentQuery,
  );

  // 返回新状态
  return {
    lastCommentByIssue: newLastCommentIds,
  };
}

/**
 * 获取 Issue 列表
 */
async function fetchIssues(
  client: GitcodeClient,
  url: string,
  issueQuery?: ListIssuesQuery,
): Promise<Issue[]> {
  return await client.issue.list(url, issueQuery ?? {});
}

/**
 * 检测新评论
 */
async function detectNewComments(
  issues: Issue[],
  prevLastCommentIds: Map<number, Set<number>>,
  client: GitcodeClient,
  url: string,
  emit: EmitFn,
  commentQuery?: IssueCommentsQuery,
): Promise<Map<number, Set<number>>> {
  const newLastCommentIds = new Map<number, Set<number>>();

  for (const issue of issues) {
    const issueNumber = Number(issue.number);
    if (!Number.isFinite(issueNumber)) continue;

    // 获取评论
    const { data: comments, notModified } = await fetchIssueComments(
      client,
      url,
      issueNumber,
      commentQuery,
    );

    const existingLastSeen = prevLastCommentIds.get(issueNumber);

    // 如果数据未修改
    if (notModified) {
      if (!existingLastSeen) {
        newLastCommentIds.set(issueNumber, new Set(comments.map((c) => c.id)));
      } else {
        newLastCommentIds.set(issueNumber, existingLastSeen);
      }
      continue;
    }

    // 如果没有评论
    if (!comments.length) {
      newLastCommentIds.set(issueNumber, new Set());
      continue;
    }

    const currentCommentIds = new Set(comments.map((c) => c.id));

    // 首次检查该 Issue
    if (!existingLastSeen) {
      newLastCommentIds.set(issueNumber, currentCommentIds);
      continue;
    }

    // 检测新评论
    const newCommentIds = new Set(
      comments.filter((c) => !existingLastSeen.has(c.id)).map((c) => c.id),
    );

    if (newCommentIds.size > 0) {
      const newComments = comments
        .filter((c) => newCommentIds.has(c.id))
        .sort((a, b) => a.id - b.id);

      for (const comment of newComments) {
        emit('issue:comment:created', { issue, comment });
      }
    }

    newLastCommentIds.set(issueNumber, currentCommentIds);
  }

  return newLastCommentIds;
}

/**
 * 获取 Issue 评论
 */
async function fetchIssueComments(
  client: GitcodeClient,
  url: string,
  issueNumber: number,
  commentQuery?: IssueCommentsQuery,
): Promise<{ data: IssueComment[]; notModified: boolean }> {
  const data = await client.issue.comments(url, issueNumber, commentQuery ?? {});
  return { data, notModified: isNotModified(data) };
}
