import { GitcodeClient, Issue, IssueComment } from '@gitany/gitcode';
import { loadJsonSync, persistJson } from '../utils/persist';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@gitany/core');
const DEFAULT_INTERVAL_SEC = 5;

interface WatchIssueOptions {
  onOpen?: (issue: Issue) => void;
  onClosed?: (issue: Issue) => void;
  onComment?: (issue: Issue, comment: IssueComment) => void;
  intervalSec?: number;
}

export interface WatchIssueHandle {
  stop(): void;
}

export function watchIssue(
  client: GitcodeClient,
  url: string,
  options: WatchIssueOptions,
): WatchIssueHandle {
  const state = createWatcherState(url);

  const check = async () => {
    const currentList = await fetchIssues(client, url);
    await detectStateChanges(currentList, state, options);
    await detectNewComments(client, url, currentList, state, options);
    state.issueList = currentList.map((i) => ({
      id: i.id,
      number: Number(i.number),
      state: i.state,
    }));
    await persistState(url, state);
  };

  void check();

  const intervalMs = 1000 * (options.intervalSec ?? DEFAULT_INTERVAL_SEC);
  const intervalId = setInterval(() => void check(), intervalMs);
  return {
    stop: () => clearInterval(intervalId),
  } satisfies WatchIssueHandle;
}

async function triggerIssueEvent(issue: Issue, options: WatchIssueOptions) {
  if (issue.state === 'open') {
    options.onOpen?.(issue);
  } else if (issue.state === 'closed') {
    options.onClosed?.(issue);
  }
}

// -------- Internal helpers --------

type WatcherState = {
  issueList: BaselineIssue[];
  lastCommentIdByIssue: Map<number, number>; // issue.number -> last seen comment id
};

type BaselineIssue = { id: number; number: number; state: Issue['state'] };

function createWatcherState(url: string): WatcherState {
  const persisted = loadPersistedStateSync(url);
  if (persisted) return persisted;
  return { issueList: [], lastCommentIdByIssue: new Map() };
}

async function fetchIssues(client: GitcodeClient, url: string): Promise<Issue[]> {
  return await client.issue.list(url, { state: 'all', page: 1, per_page: 10 });
}

async function detectStateChanges(
  newList: Issue[],
  state: WatcherState,
  options: WatchIssueOptions,
) {
  const prev = state.issueList;
  for (const issue of newList) {
    const existed = prev.find((i) => i.id === issue.id);
    if (!existed) {
      await triggerIssueEvent(issue, options);
      continue;
    }
    if (existed.state !== issue.state) {
      await triggerIssueEvent(issue, options);
    }
  }
}

async function detectNewComments(
  client: GitcodeClient,
  url: string,
  newList: Issue[],
  state: WatcherState,
  options: WatchIssueOptions,
) {
  if (!options.onComment) return;

  for (const issue of newList) {
    if (issue.state !== 'open') continue;
    const issueNumber = Number(issue.number);

    const comments = await fetchIssueComments(client, url, issueNumber);
    if (!comments.length) continue;

    const lastSeen = state.lastCommentIdByIssue.get(issueNumber);
    if (lastSeen === undefined) {
      state.lastCommentIdByIssue.set(issueNumber, comments[0].id);
      continue;
    }

    let maxId = lastSeen;
    for (let i = comments.length - 1; i >= 0; i--) {
      const c = comments[i];
      if (c.id > lastSeen) {
        options.onComment?.(issue, c);
        if (c.id > maxId) maxId = c.id;
      }
    }
    if (maxId !== lastSeen) {
      state.lastCommentIdByIssue.set(issueNumber, maxId);
    }
  }
}

async function fetchIssueComments(
  client: GitcodeClient,
  url: string,
  issueNumber: number,
): Promise<IssueComment[]> {
  return await client.issue.comments(url, issueNumber);
}

// -------- Persistence --------

type PersistShape = {
  issues: Array<{ id: number; number: number; state: Issue['state'] }>;
  lastCommentIdByIssue: Record<string, number>;
};

const STORE_SUBDIR = 'issues';

function loadPersistedStateSync(url: string): WatcherState | null {
  try {
    const data = loadJsonSync<PersistShape>(url, STORE_SUBDIR);
    if (!data) return null;
    const lastMap = new Map<number, number>();
    for (const [k, v] of Object.entries(data.lastCommentIdByIssue ?? {})) {
      const num = Number(k);
      if (!Number.isNaN(num)) lastMap.set(num, v);
    }
    const issueList: BaselineIssue[] = (data.issues ?? []).map((i) => ({
      id: i.id,
      state: i.state,
      number: i.number,
    }));
    return { issueList, lastCommentIdByIssue: lastMap };
  } catch (err) {
    const msg = '[watchIssue] 读取持久化状态失败';
    logger.error({ url, err }, msg);
    return null;
  }
}

async function persistState(url: string, state: WatcherState) {
  try {
    const data: PersistShape = {
      issues: state.issueList.map((i) => ({ id: i.id, state: i.state, number: i.number })),
      lastCommentIdByIssue: Object.fromEntries(state.lastCommentIdByIssue),
    };
    await persistJson(url, STORE_SUBDIR, data);
  } catch (err) {
    logger.error({ err }, '[watchIssue] 持久化状态失败');
  }
}

