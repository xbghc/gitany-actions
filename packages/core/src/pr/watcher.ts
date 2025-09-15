import { GitcodeClient, PullRequest, PRComment, PRCommentQueryOptions } from '@gitany/gitcode';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import { ensureDir, resolveGitcodeSubdir, sha1Hex } from '../utils';
import * as path from 'node:path';
import { createLogger } from '@gitany/shared';
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
}

export function watchPullRequest(
  client: GitcodeClient,
  url: string,
  options: WatchPullRequestOptions,
) {
  const state = createWatcherState(url);

  const check = async () => {
    const currentList = await fetchPullRequests(client, url);
    detectStateChanges(currentList, state, options);
    await detectNewComments(client, url, currentList, state, options);
    state.prList = currentList.map((p) => ({ id: p.id, number: p.number, state: p.state }));
    await persistState(url, state);
  };

  // 立即进行一次检查以尽快建立基线
  void check();

  const intervalMs = 1000 * (options.intervalSec ?? DEFAULT_INTERVAL_SEC);
  const intervalId = setInterval(() => void check(), intervalMs);
  return () => clearInterval(intervalId);
}

export function triggerPullRequestEvent(pr: PullRequest, options: WatchPullRequestOptions) {
  const { onClosed, onMerged, onOpen } = options;
  if (onOpen && pr.state === 'open') {
    onOpen(pr);
  } else if (onClosed && pr.state === 'closed') {
    onClosed(pr);
  } else if (onMerged && pr.state === 'merged') {
    onMerged(pr);
  }
}

// -------- Internal helpers --------

type WatcherState = {
  prList: BaselinePR[];
  lastCommentIdByPr: Map<number, number>; // pr.number -> last seen comment id
};

type BaselinePR = Pick<PullRequest, 'id' | 'number' | 'state'>;

function createWatcherState(url: string): WatcherState {
  // 从磁盘加载上次的基线，避免程序重启后重复触发“新增/新评论”事件
  const persisted = loadPersistedStateSync(url);
  if (persisted) return persisted;
  return { prList: [], lastCommentIdByPr: new Map() };
}

async function fetchPullRequests(client: GitcodeClient, url: string) {
  return await client.pr.list(url, { state: 'all', page: 1, per_page: 10 });
}

function detectStateChanges(
  newList: PullRequest[],
  state: WatcherState,
  options: WatchPullRequestOptions,
) {
  const prev = state.prList;
  for (const pr of newList) {
    const existed = prev.find((p) => p.id === pr.id);
    if (!existed) {
      // 新增 PR（首次看到）。按当前状态触发一次回调
      triggerPullRequestEvent(pr, options);
      continue;
    }
    if (existed.state !== pr.state) {
      triggerPullRequestEvent(pr, options);
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

    const comments = await fetchPrComments(client, url, pr.number, options);
    if (!comments.length) continue;

    const lastSeen = state.lastCommentIdByPr.get(pr.number);
    if (lastSeen === undefined) {
      // 首次建立基线：记录最新的评论 ID，避免历史评论触发
      state.lastCommentIdByPr.set(pr.number, comments[0].id);
      continue;
    }

    // 触发新增评论（按时间/ID 降序返回时，> lastSeen 即为新评论）
    let maxId = lastSeen;
    for (let i = comments.length - 1; i >= 0; i--) {
      const c = comments[i];
      if (c.id > lastSeen) {
        options.onComment?.(pr, c);
        if (c.id > maxId) maxId = c.id;
      }
    }
    if (maxId !== lastSeen) {
      state.lastCommentIdByPr.set(pr.number, maxId);
    }
  }
}

// 使用 client 的 PR 评论接口，与 issue 无关
async function fetchPrComments(
  client: GitcodeClient,
  url: string,
  prNumber: number,
  options?: WatchPullRequestOptions,
): Promise<PRComment[]> {
  // 默认拉取所有类型评论；如提供 commentType 则按类型过滤（使用静态导入的类型）
  const query: PRCommentQueryOptions | undefined =
    options?.commentType ? { comment_type: options.commentType } : undefined;
  return await client.pr.comments(url, prNumber, query);
}

// -------- Persistence (fast, lightweight) --------
type PersistShape = {
  // Minimal info to identify PRs and detect state changes across restarts
  prs: Array<{ id: number; number: number; state: PullRequest['state'] }>;
  lastCommentIdByPr: Record<string, number>; // key: pr.number
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
    const lastMap = new Map<number, number>();
    for (const [k, v] of Object.entries(data.lastCommentIdByPr ?? {})) {
      const num = Number(k);
      if (!Number.isNaN(num)) lastMap.set(num, v);
    }
    // 仅需要 id/state/number 用于事件对比；避免在类型上引入过多属性
    const prList: BaselinePR[] = (data.prs ?? []).map((p) => ({ id: p.id, state: p.state, number: p.number }));
    return { prList, lastCommentIdByPr: lastMap };
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
      lastCommentIdByPr: Object.fromEntries(state.lastCommentIdByPr),
    };
    await fs.writeFile(file, JSON.stringify(data), 'utf8');
  } catch (err) {
    // 忽略持久化错误，避免影响主流程，但应打印错误便于排查
    logger.error({ err }, '[watchPullRequest] 持久化状态失败');
  }
}
