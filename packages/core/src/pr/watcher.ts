import {
  GitcodeClient,
  PullRequest,
  PRComment,
  PRCommentQueryOptions,
  isNotModified,
} from '@gitany/gitcode';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import { ensureDir, resolveGitcodeSubdir, sha1Hex } from '../utils';
import * as path from 'node:path';
import type Docker from 'dockerode';
import { createLogger } from '@gitany/shared';
import { createPrContainer, removeContainer, cleanupPrContainers } from '../container';
import type { ContainerOptions } from '../container/types';
const logger = createLogger('@gitany/core');
const DEFAULT_INTERVAL_SEC = 5;

interface WatchPullRequestOptions {
  onClosed?: (pr: PullRequest) => void;
  onOpen?: (pr: PullRequest) => void;
  onMerged?: (pr: PullRequest) => void;
  onComment?: (pr: PullRequest, comment: PRComment) => void;
  intervalSec?: number;
  // 可选：仅拉取某一类评论（'pr_comment' 或 'diff_comment'）。
  // 不设置时默认拉取所有类型评论。
  commentType?: 'diff_comment' | 'pr_comment';
  /** 启用内置容器管理。传入容器选项或 false 以禁用 */
  container?: ContainerOptions | false;
  /** 容器创建后回调 */
  onContainerCreated?: (container: Docker.Container, pr: PullRequest) => void;
  /** 容器移除后回调 */
  onContainerRemoved?: (prId: number) => void;
}

export interface WatchPullRequestHandle {
  stop(): void;
  containers(): Map<number, Docker.Container>;
}

export function watchPullRequest(
  client: GitcodeClient,
  url: string,
  options: WatchPullRequestOptions,
) {
  const state = createWatcherState(url);
  const containerMap = new Map<number, Docker.Container>();

  const check = async () => {
    const { data: currentList, notModified } = await fetchPullRequests(client, url);
    if (!notModified) {
      await detectStateChanges(currentList, state, options, url, containerMap);
    }
    await detectNewComments(client, url, currentList, state, options);
    if (!notModified) {
      state.prList = currentList.map((p) => ({ id: p.id, number: p.number, state: p.state }));
    }
    await persistState(url, state);
  };

    // 立即进行一次检查以尽快建立基线
    void (async () => {
      await cleanupPrContainers();
      await check();
    })();

  const intervalMs = 1000 * (options.intervalSec ?? DEFAULT_INTERVAL_SEC);
  const intervalId = setInterval(() => void check(), intervalMs);
  return {
    stop: () => clearInterval(intervalId),
    containers: () => containerMap,
  } satisfies WatchPullRequestHandle;
}

export async function triggerPullRequestEvent(
  pr: PullRequest,
  repoUrl: string,
  options: WatchPullRequestOptions,
  containerMap: Map<number, Docker.Container>,
) {
  const { onClosed, onMerged, onOpen, container, onContainerCreated, onContainerRemoved } = options;
  if (pr.state === 'open') {
    if (container !== false && container !== undefined) {
      const created = await createPrContainer(repoUrl, pr, container || {});
      containerMap.set(pr.id, created);
      onContainerCreated?.(created, pr);
    }
    onOpen?.(pr);
  } else if (pr.state === 'closed') {
    if (container !== false && container !== undefined) {
      await removeContainer(pr.id);
      containerMap.delete(pr.id);
      onContainerRemoved?.(pr.id);
    }
    onClosed?.(pr);
  } else if (pr.state === 'merged') {
    if (container !== false && container !== undefined) {
      await removeContainer(pr.id);
      containerMap.delete(pr.id);
      onContainerRemoved?.(pr.id);
    }
    onMerged?.(pr);
  }
}

// -------- Internal helpers --------

type WatcherState = {
  prList: BaselinePR[];
  lastCommentIdsByPr: Map<number, Set<number>>; // pr.number -> set of seen comment ids
};

type BaselinePR = Pick<PullRequest, 'id' | 'number' | 'state'>;

function createWatcherState(url: string): WatcherState {
  // 从磁盘加载上次的基线，避免程序重启后重复触发"新增/新评论"事件
  const persisted = loadPersistedStateSync(url);
  if (persisted) return persisted;
  return { prList: [], lastCommentIdsByPr: new Map() };
}

async function fetchPullRequests(
  client: GitcodeClient,
  url: string,
): Promise<{ data: PullRequest[]; notModified: boolean }> {
  const data = await client.pr.list(url, { state: 'all', page: 1, per_page: 10 });
  return { data, notModified: isNotModified(data) };
}

async function detectStateChanges(
  newList: PullRequest[],
  state: WatcherState,
  options: WatchPullRequestOptions,
  repoUrl: string,
  containerMap: Map<number, Docker.Container>,
) {
  const prev = state.prList;
  for (const pr of newList) {
    const existed = prev.find((p) => p.id === pr.id);
    if (!existed) {
      // 新增 PR（首次看到）。按当前状态触发一次回调
      await triggerPullRequestEvent(pr, repoUrl, options, containerMap);
      continue;
    }
    if (existed.state !== pr.state) {
      await triggerPullRequestEvent(pr, repoUrl, options, containerMap);
    }
  }
}

async function detectNewComments(
  client: GitcodeClient,
  url: string,
  newList: PullRequest[],
  state: WatcherState,
  options: WatchPullRequestOptions,
) {
  if (!options.onComment) return;

  for (const pr of newList) {
    // 仅对打开的 PR 拉取评论，减少请求
    if (pr.state !== 'open') continue;

    const { data: comments, notModified } = await fetchPrComments(client, url, pr.number, options);
    const existingLastSeen = state.lastCommentIdsByPr.get(pr.number);

    if (notModified) {
      if (!existingLastSeen) {
        state.lastCommentIdsByPr.set(pr.number, new Set(comments.map(comment => comment.id)));
      }
      continue;
    }

    if (!comments.length) {
      if (!existingLastSeen) {
        state.lastCommentIdsByPr.set(pr.number, new Set());
      }
      continue;
    }

    const currentCommentIds = new Set(comments.map(comment => comment.id));

    if (!existingLastSeen) {
      state.lastCommentIdsByPr.set(pr.number, currentCommentIds);
      continue;
    }

    const newCommentIds = new Set<number>();
    for (const commentId of currentCommentIds) {
      if (!existingLastSeen.has(commentId)) {
        newCommentIds.add(commentId);
      }
    }

    if (newCommentIds.size > 0) {
      const newComments = comments.filter(comment => newCommentIds.has(comment.id));
      newComments.sort((a, b) => a.id - b.id);

      for (const comment of newComments) {
        options.onComment?.(pr, comment);
      }
    }

    state.lastCommentIdsByPr.set(pr.number, currentCommentIds);
  }
}

// 使用 client 的 PR 评论接口，与 issue 无关
async function fetchPrComments(
  client: GitcodeClient,
  url: string,
  prNumber: number,
  options?: WatchPullRequestOptions,
): Promise<{ data: PRComment[]; notModified: boolean }> {
  // 默认拉取所有类型评论；如提供 commentType 则按类型过滤（使用静态导入的类型）
  const query: PRCommentQueryOptions | undefined =
    options?.commentType ? { comment_type: options.commentType } : undefined;
  const data = await client.pr.comments(url, prNumber, query);
  return { data, notModified: isNotModified(data) };
}

// -------- Persistence (fast, lightweight) --------
type PersistShape = {
  // Minimal info to identify PRs and detect state changes across restarts
  prs: Array<{ id: number; number: number; state: PullRequest['state'] }>;
  lastCommentIdsByPr: Record<string, number[]>; // key: pr.number
};

function getStoreDir() {
  // Align with CLI auth location: ~/.gitany/gitcode
  return resolveGitcodeSubdir('watchers');
}

function urlKey(url: string) {
  return sha1Hex(url);
}

function getStoreFile(url: string) {
  return path.join(getStoreDir(), `${urlKey(url)}.json`);
}

function loadPersistedStateSync(url: string): WatcherState | null {
  try {
    const file = getStoreFile(url);
    if (!fsSync.existsSync(file)) return null;
    const raw = fsSync.readFileSync(file, 'utf8');
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistShape;
    const lastMap = new Map<number, Set<number>>();
    for (const [k, v] of Object.entries(data.lastCommentIdsByPr ?? {})) {
      const num = Number(k);
      if (!Number.isNaN(num) && Array.isArray(v)) {
        const commentIds = v.filter(id => typeof id === 'number' && !isNaN(id));
        lastMap.set(num, new Set(commentIds));
      }
    }
    // 仅需要 id/state/number 用于事件对比；避免在类型上引入过多属性
    const prList: BaselinePR[] = (data.prs ?? []).map((p) => ({ id: p.id, state: p.state, number: p.number }));
    return { prList, lastCommentIdsByPr: lastMap };
  } catch (err) {
    // 使用统一 logger 记录错误（stderr）
    const msg = '[watchPullRequest] 读取持久化状态失败';
    logger.error({ url, err }, msg);
    return null;
  }
}

async function persistState(url: string, state: WatcherState) {
  try {
    const dir = getStoreDir();
    await ensureDir(dir);
    const file = getStoreFile(url);
    const data: PersistShape = {
      prs: state.prList.map((p) => ({ id: p.id, state: p.state, number: p.number })),
      lastCommentIdsByPr: Object.fromEntries(
        Array.from(state.lastCommentIdsByPr.entries()).map(([key, value]) => [
          key,
          Array.from(value),
        ])
      ),
    };
    await fs.writeFile(file, JSON.stringify(data), 'utf8');
  } catch (err) {
    // 忽略持久化错误，避免影响主流程，但应打印错误便于排查
    logger.error({ err }, '[watchPullRequest] 持久化状态失败');
  }
}
