import {
  GitcodeClient,
  type Issue,
  type IssueComment,
  type ListIssuesQuery,
  type IssueCommentsQuery,
  isNotModified,
} from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir, resolveGitcodeSubdir, sha1Hex } from '../utils';

const logger = createLogger('@gitany/core');
const DEFAULT_INTERVAL_SEC = 5;

export interface WatchIssueOptions {
  intervalSec?: number;
  issueQuery?: ListIssuesQuery;
  commentQuery?: IssueCommentsQuery;
  onComment?: (issue: Issue, comment: IssueComment) => void;
}

export interface WatchIssueHandle {
  stop(): void;
}

type WatcherState = {
  lastCommentIdByIssue: Map<number, number>;
};

type PersistShape = {
  lastCommentIdByIssue: Record<string, number>;
};

function createWatcherState(url: string): WatcherState {
  const persisted = loadPersistedStateSync(url);
  if (persisted) return persisted;
  return { lastCommentIdByIssue: new Map() };
}

export function watchIssues(
  client: GitcodeClient,
  url: string,
  options: WatchIssueOptions = {},
): WatchIssueHandle {
  const state = createWatcherState(url);

  const check = async () => {
    try {
      const { data: issues } = await fetchIssues(client, url, options);
      await detectNewComments(client, url, issues, state, options);
      await persistState(url, state);
    } catch (err) {
      logger.error({ err, url }, '[watchIssues] poll failed');
    }
  };

  void check();

  const intervalMs = 1000 * (options.intervalSec ?? DEFAULT_INTERVAL_SEC);
  const intervalId = setInterval(() => {
    void check();
  }, intervalMs);

  return {
    stop: () => clearInterval(intervalId),
  } satisfies WatchIssueHandle;
}

async function fetchIssues(
  client: GitcodeClient,
  url: string,
  options: WatchIssueOptions,
): Promise<{ data: Issue[] }> {
  const query = options.issueQuery ?? { state: 'all', page: 1, per_page: 20 };
  const data = await client.issue.list(url, query);
  return { data };
}

async function fetchIssueComments(
  client: GitcodeClient,
  url: string,
  issueNumber: number,
  options: WatchIssueOptions,
): Promise<{ data: IssueComment[]; notModified: boolean }> {
  const query = options.commentQuery;
  const data = await client.issue.comments(url, issueNumber, query ?? {});
  return { data, notModified: isNotModified(data) };
}

async function detectNewComments(
  client: GitcodeClient,
  url: string,
  issues: Issue[],
  state: WatcherState,
  options: WatchIssueOptions,
) {
  if (!options.onComment) return;

  for (const issue of issues) {
    const issueNumber = Number(issue.number);
    if (!Number.isFinite(issueNumber)) continue;

    let result: { data: IssueComment[]; notModified: boolean };
    try {
      result = await fetchIssueComments(client, url, issueNumber, options);
    } catch (err) {
      logger.error({ err, url, issueNumber }, '[watchIssues] failed to fetch comments');
      continue;
    }

    const { data: comments, notModified } = result;
    const existingLastSeen = state.lastCommentIdByIssue.get(issueNumber);

    if (notModified) {
      if (existingLastSeen === undefined) {
        const highestId = comments.reduce((max, comment) => (comment.id > max ? comment.id : max), 0);
        state.lastCommentIdByIssue.set(issueNumber, highestId);
      }
      break;
    }

    if (comments.length === 0) {
      if (existingLastSeen === undefined) {
        // 记录已建立的基线，即便当前还没有评论，后续新增的首条评论也能被捕获
        state.lastCommentIdByIssue.set(issueNumber, 0);
        continue;
      }
      break;
    }

    if (existingLastSeen === undefined) {
      const highestId = comments.reduce((max, comment) => (comment.id > max ? comment.id : max), 0);
      state.lastCommentIdByIssue.set(issueNumber, highestId);
      continue;
    }

    const lastSeen = existingLastSeen;

    let maxId = lastSeen;
    let hasNewComment = false;
    for (let i = comments.length - 1; i >= 0; i -= 1) {
      const comment = comments[i];
      if (comment.id > lastSeen) {
        hasNewComment = true;
        options.onComment?.(issue, comment);
        if (comment.id > maxId) {
          maxId = comment.id;
        }
      }
    }

    if (maxId !== lastSeen) {
      state.lastCommentIdByIssue.set(issueNumber, maxId);
    }

    if (!hasNewComment) {
      break;
    }
  }
}

function getStoreDir() {
  return path.join(resolveGitcodeSubdir('watchers'), 'issues');
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
    for (const [key, value] of Object.entries(data.lastCommentIdByIssue ?? {})) {
      const num = Number(key);
      if (!Number.isNaN(num)) {
        lastMap.set(num, value);
      }
    }
    return { lastCommentIdByIssue: lastMap };
  } catch (err) {
    logger.error({ url, err }, '[watchIssues] Failed to read persisted state');
    return null;
  }
}

async function persistState(url: string, state: WatcherState) {
  try {
    const dir = getStoreDir();
    await ensureDir(dir);
    const file = getStoreFile(url);
    const data: PersistShape = {
      lastCommentIdByIssue: Object.fromEntries(state.lastCommentIdByIssue),
    };
    await fs.writeFile(file, JSON.stringify(data), 'utf8');
  } catch (err) {
    logger.error({ err }, '[watchIssues] Failed to persist state');
  }
}
