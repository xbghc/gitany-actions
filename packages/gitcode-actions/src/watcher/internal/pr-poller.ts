import type {
  GitcodeClient,
  PRComment,
  PRCommentQueryOptions,
  PullRequest,
} from '@xbghc/gitcode-api';
import { isNotModified } from '@xbghc/gitcode-api';
import type { EmitFn, PollContext } from './resource-runner.js';

/**
 * PR 状态定义
 */
export type PrState = {
  prList: Array<{ id: number; number: number; state: string }>;
  lastCommentIdsByPr: Map<number, Set<number>>;
};

/**
 * PR 轮询选项
 */
export interface PrPollerOptions {
  commentType?: 'diff_comment' | 'pr_comment';
}

/**
 * 获取 PR 初始状态
 */
export function getInitialPrState(): PrState {
  return {
    prList: [],
    lastCommentIdsByPr: new Map(),
  };
}

/**
 * PR 轮询主函数
 *
 * @param state - 当前状态
 * @param context - 轮询上下文
 * @param emit - 事件发射函数
 * @param options - 轮询选项
 * @returns 新状态
 */
export async function pollPullRequests(
  state: PrState,
  context: PollContext,
  emit: EmitFn,
  options: PrPollerOptions = {},
): Promise<PrState> {
  // 1. 获取当前 PR 列表
  const { data: currentPrs, notModified } = await fetchPullRequests(context.client, context.url);

  // 2. 检测状态变化（仅在数据未被修改时跳过）
  if (!notModified) {
    await detectStateChanges(state.prList, currentPrs, emit);
  }

  // 3. 检测新评论
  const newLastCommentIds = await detectNewComments(
    currentPrs,
    state.lastCommentIdsByPr,
    context.client,
    context.url,
    emit,
    options.commentType,
  );

  // 4. 返回新状态
  return {
    prList: notModified
      ? state.prList
      : currentPrs.map((p) => ({ id: p.id, number: p.number, state: p.state })),
    lastCommentIdsByPr: newLastCommentIds,
  };
}

/**
 * 获取 PR 列表
 */
async function fetchPullRequests(
  client: GitcodeClient,
  url: string,
): Promise<{ data: PullRequest[]; notModified: boolean }> {
  const data = await client.pr.list(url, { state: 'all', page: 1, per_page: 10 });
  return { data, notModified: isNotModified(data) };
}

/**
 * 检测 PR 状态变化
 */
async function detectStateChanges(
  prevPrList: Array<{ id: number; number: number; state: string }>,
  newPrList: PullRequest[],
  emit: EmitFn,
): Promise<void> {
  for (const pr of newPrList) {
    const existed = prevPrList.find((p) => p.id === pr.id);

    // 新 PR 或状态变化
    if (!existed || existed.state !== pr.state) {
      triggerPullRequestEvent(pr, emit);
    }
  }
}

/**
 * 触发 PR 事件
 */
function triggerPullRequestEvent(pr: PullRequest, emit: EmitFn): void {
  if (pr.state === 'open') {
    emit('pr:opened', { pr });
  } else if (pr.state === 'closed') {
    emit('pr:closed', { pr });
  } else if (pr.state === 'merged') {
    emit('pr:merged', { pr });
  }
}

/**
 * 检测新评论
 */
async function detectNewComments(
  prList: PullRequest[],
  prevLastCommentIds: Map<number, Set<number>>,
  client: GitcodeClient,
  url: string,
  emit: EmitFn,
  commentType?: 'diff_comment' | 'pr_comment',
): Promise<Map<number, Set<number>>> {
  const newLastCommentIds = new Map<number, Set<number>>();

  for (const pr of prList) {
    // 只检查 open 状态的 PR
    if (pr.state !== 'open') {
      // 保留之前的评论 ID
      const prev = prevLastCommentIds.get(pr.number);
      if (prev) {
        newLastCommentIds.set(pr.number, prev);
      }
      continue;
    }

    // 获取评论
    const { data: comments, notModified } = await fetchPrComments(
      client,
      url,
      pr.number,
      commentType,
    );

    const existingLastSeen = prevLastCommentIds.get(pr.number);

    // 如果数据未修改
    if (notModified) {
      if (!existingLastSeen) {
        newLastCommentIds.set(pr.number, new Set(comments.map((c) => c.id)));
      } else {
        newLastCommentIds.set(pr.number, existingLastSeen);
      }
      continue;
    }

    // 如果没有评论
    if (!comments.length) {
      newLastCommentIds.set(pr.number, new Set());
      continue;
    }

    const currentCommentIds = new Set(comments.map((c) => c.id));

    // 首次检查该 PR
    if (!existingLastSeen) {
      newLastCommentIds.set(pr.number, currentCommentIds);
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
        emit('pr:comment:created', { pr, comment });
      }
    }

    newLastCommentIds.set(pr.number, currentCommentIds);
  }

  return newLastCommentIds;
}

/**
 * 获取 PR 评论
 */
async function fetchPrComments(
  client: GitcodeClient,
  url: string,
  prNumber: number,
  commentType?: 'diff_comment' | 'pr_comment',
): Promise<{ data: PRComment[]; notModified: boolean }> {
  const query: PRCommentQueryOptions | undefined = commentType
    ? { comment_type: commentType }
    : undefined;

  const data = await client.pr.comments(url, prNumber, query);
  return { data, notModified: isNotModified(data) };
}
