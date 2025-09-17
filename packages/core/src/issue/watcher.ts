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

type LastSeenComment = {
  id: number;
  createdAt: string | null;
};

type WatcherState = {
  lastCommentByIssue: Map<number, LastSeenComment>;
};

type PersistShape = {
  lastCommentByIssue: Record<string, LastSeenComment>;
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
    return this.state.lastCommentByIssue.get(issueNumber)?.id;
  }

  protected async detectNewComments(issues: Issue[]): Promise<void> {
    if (!this.options.onComment) {
      return;
    }

    logger.info('[watchIssues] detecting new comments');
    for (const issue of issues) {
      // TODO 拆分
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
      const existingLastSeen = this.state.lastCommentByIssue.get(issueNumber);

      if (notModified) {
        if (!existingLastSeen) {
          const latest = comments[comments.length - 1];
          if (latest) {
            this.state.lastCommentByIssue.set(issueNumber, IssueWatcher.toLastSeen(latest));
          } else {
            this.state.lastCommentByIssue.set(issueNumber, IssueWatcher.emptyLastSeen());
          }
        }
        continue;
      }

      if (comments.length === 0) {
        if (!existingLastSeen) {
          this.state.lastCommentByIssue.set(issueNumber, IssueWatcher.emptyLastSeen());
        }
        continue;
      }

      const latestComment = comments[comments.length - 1];

      if (!existingLastSeen) {
        this.state.lastCommentByIssue.set(issueNumber, IssueWatcher.toLastSeen(latestComment));
        continue;
      }

      const collected: IssueComment[] = [];
      let baselineFound = false;
      for (let i = comments.length - 1; i >= 0; i -= 1) {
        const comment = comments[i];
        if (comment.id === existingLastSeen.id) {
          baselineFound = true;
          break;
        }
        collected.push(comment);
      }

      const newComments = baselineFound ? collected.reverse() : [...comments];

      if (newComments.length > 0) {
        for (const comment of newComments) {
          this.options.onComment?.(issue, comment);
        }
      }

      this.state.lastCommentByIssue.set(issueNumber, IssueWatcher.toLastSeen(latestComment));
    }
    logger.info('[watchIssues] detecting new comments complete');
  }

  private static emptyLastSeen(): LastSeenComment {
    return { id: 0, createdAt: null };
  }

  private static toLastSeen(comment: IssueComment): LastSeenComment {
    const createdAt = typeof comment.created_at === 'string' ? comment.created_at : null;
    return { id: comment.id, createdAt };
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
    return { lastCommentByIssue: new Map() };
  }

  private async persistState(): Promise<void> {
    try {
      const dir = IssueWatcher.getStoreDir();
      await ensureDir(dir);
      const file = IssueWatcher.getStoreFile(this.url);
      const data: PersistShape = {
        lastCommentByIssue: Object.fromEntries(this.state.lastCommentByIssue),
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
      const lastMap = new Map<number, LastSeenComment>();
      for (const [key, value] of Object.entries(data.lastCommentByIssue ?? {})) {
        const num = Number(key);
        if (!Number.isNaN(num) && value && typeof value === 'object') {
          const parsedValue = value as Partial<LastSeenComment>;
          const id = typeof parsedValue.id === 'number' ? parsedValue.id : 0;
          const createdAt =
            typeof parsedValue.createdAt === 'string' ? parsedValue.createdAt : null;
          lastMap.set(num, { id, createdAt });
        }
      }
      return { lastCommentByIssue: lastMap };
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
