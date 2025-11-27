import type {
  GitCodeClient,
  PRComment,
  PRCommentQueryOptions,
  PullRequest,
} from '@xbghc/gitcode-api';
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
  const { data: currentPrs, notModified } = await fetchPullRequests(context.client, context.url);

  if (!notModified) {
    await detectStateChanges(state.prList, currentPrs, emit);
  }

  const newLastCommentIds = await detectNewComments(
    currentPrs,
    state.lastCommentIdsByPr,
    context.client,
    context.url,
    emit,
    options.commentType,
  );

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
  client: GitCodeClient,
  url: string,
): Promise<{ data: PullRequest[]; notModified: boolean }> {
  const data = await client.pr.list(url, { state: 'all', page: 1, per_page: 10 });
  return { data, notModified: false };
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
  client: GitCodeClient,
  url: string,
  emit: EmitFn,
  commentType?: 'diff_comment' | 'pr_comment',
): Promise<Map<number, Set<number>>> {
  const newLastCommentIds = new Map<number, Set<number>>();

  for (const pr of prList) {
    if (pr.state !== 'open') {
      const prev = prevLastCommentIds.get(pr.number);
      if (prev) {
        newLastCommentIds.set(pr.number, prev);
      }
      continue;
    }

    const { data: comments, notModified } = await fetchPrComments(
      client,
      url,
      pr.number,
      commentType,
    );

    const existingLastSeen = prevLastCommentIds.get(pr.number);

    if (notModified) {
      if (!existingLastSeen) {
        newLastCommentIds.set(pr.number, new Set(comments.map((c) => c.id)));
      } else {
        newLastCommentIds.set(pr.number, existingLastSeen);
      }
      continue;
    }

    if (!comments.length) {
      newLastCommentIds.set(pr.number, new Set());
      continue;
    }

    const currentCommentIds = new Set(comments.map((c) => c.id));

    if (!existingLastSeen) {
      newLastCommentIds.set(pr.number, currentCommentIds);
      continue;
    }

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
  client: GitCodeClient,
  url: string,
  prNumber: number,
  commentType?: 'diff_comment' | 'pr_comment',
): Promise<{ data: PRComment[]; notModified: boolean }> {
  const query: PRCommentQueryOptions | undefined = commentType
    ? { comment_type: commentType }
    : undefined;

  const data = await client.pr.comments(url, prNumber, query);
  return { data, notModified: false };
}
