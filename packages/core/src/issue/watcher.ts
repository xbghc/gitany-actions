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

export class IssueWatcher implements WatchIssueHandle {
  protected readonly client: GitcodeClient;
  protected readonly url: string;
  protected readonly options: WatchIssueOptions;
  protected readonly state: WatcherState;
  private readonly intervalMs: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(client: GitcodeClient, url: string, options: WatchIssueOptions = {}) {
    this.client = client;
    this.url = url;
    this.options = options;
    this.intervalMs = 1000 * (options.intervalSec ?? DEFAULT_INTERVAL_SEC);
    this.state = this.loadState();
  }

  start(): this {
    if (this.intervalId) return this;

    void this.poll();
    this.intervalId = setInterval(() => {
      void this.poll();
    }, this.intervalMs);

    return this;
  }

  stop(): void {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  getLastCommentId(issueNumber: number): number | undefined {
    return this.state.lastCommentIdByIssue.get(issueNumber);
  }

  protected async detectNewComments(issues: Issue[]): Promise<void> {
    if (!this.options.onComment) {
      return;
    }

    for (const issue of issues) {
      const issueNumber = Number(issue.number);
      if (!Number.isFinite(issueNumber)) continue;

      let result: { data: IssueComment[]; notModified: boolean };
      try {
        result = await this.fetchIssueComments(issueNumber);
      } catch (err) {
        logger.error({ err, issueNumber }, '[watchIssues] failed to fetch comments');
        continue;
      }

      const { data: comments, notModified } = result;
      const existingLastSeen = this.state.lastCommentIdByIssue.get(issueNumber);

      if (notModified) {
        if (existingLastSeen === undefined) {
          const highestId = comments.reduce((max, comment) => (comment.id > max ? comment.id : max), 0);
          this.state.lastCommentIdByIssue.set(issueNumber, highestId);
        }
        continue;
      }

      if (comments.length === 0) {
        if (existingLastSeen === undefined) {
          // 记录已建立的基线，即便当前还没有评论，后续新增的首条评论也能被捕获
          this.state.lastCommentIdByIssue.set(issueNumber, 0);
          continue;
        }
        continue;
      }

      if (existingLastSeen === undefined) {
        const highestId = comments.reduce((max, comment) => (comment.id > max ? comment.id : max), 0);
        this.state.lastCommentIdByIssue.set(issueNumber, highestId);
        continue;
      }

      const lastSeen = existingLastSeen;

      let maxId = lastSeen;
      let hasNewComment = false;
      for (let i = comments.length - 1; i >= 0; i -= 1) {
        const comment = comments[i];
        if (comment.id > lastSeen) {
          hasNewComment = true;
          this.options.onComment?.(issue, comment);
          if (comment.id > maxId) {
            maxId = comment.id;
          }
        }
      }

      if (maxId !== lastSeen) {
        this.state.lastCommentIdByIssue.set(issueNumber, maxId);
      }

      if (!hasNewComment) {
        continue;
      }
    }
  }

  private async poll(): Promise<void> {
    const startedAt = Date.now();
    logger.info('[watchIssues] poll start');
    try {
      const issues = await this.fetchIssues();
      await this.detectNewComments(issues);
      await this.persistState();
      logger.info({ durationMs: Date.now() - startedAt }, '[watchIssues] poll complete');
    } catch (err) {
      logger.error({ err, durationMs: Date.now() - startedAt }, '[watchIssues] poll failed');
    }
  }

  private async fetchIssues(): Promise<Issue[]> {
    const query = this.options.issueQuery ?? { state: 'all', page: 1, per_page: 20 };
    return this.client.issue.list(this.url, query);
  }

  private async fetchIssueComments(issueNumber: number): Promise<{ data: IssueComment[]; notModified: boolean }> {
    const query = this.options.commentQuery;
    const data = await this.client.issue.comments(this.url, issueNumber, query ?? {});
    return { data, notModified: isNotModified(data) };
  }

  private loadState(): WatcherState {
    const persisted = IssueWatcher.loadPersistedStateSync(this.url);
    if (persisted) return persisted;
    return { lastCommentIdByIssue: new Map() };
  }

  private async persistState(): Promise<void> {
    try {
      const dir = IssueWatcher.getStoreDir();
      await ensureDir(dir);
      const file = IssueWatcher.getStoreFile(this.url);
      const data: PersistShape = {
        lastCommentIdByIssue: Object.fromEntries(this.state.lastCommentIdByIssue),
      };
      await fs.writeFile(file, JSON.stringify(data), 'utf8');
    } catch (err) {
      logger.error({ err }, '[watchIssues] Failed to persist state');
    }
  }

  private static loadPersistedStateSync(url: string): WatcherState | null {
    try {
      const file = IssueWatcher.getStoreFile(url);
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
      logger.error({ err }, '[watchIssues] Failed to read persisted state');
      return null;
    }
  }

  private static getStoreDir(): string {
    return path.join(resolveGitcodeSubdir('watchers'), 'issues');
  }

  private static getStoreFile(url: string): string {
    return path.join(IssueWatcher.getStoreDir(), `${urlKey(url)}.json`);
  }
}

export function watchIssues(
  client: GitcodeClient,
  url: string,
  options: WatchIssueOptions = {},
): WatchIssueHandle {
  return new IssueWatcher(client, url, options).start();
}

const __testing = {
  IssueWatcher,
};

export { __testing };

function urlKey(url: string) {
  return sha1Hex(url);
}
