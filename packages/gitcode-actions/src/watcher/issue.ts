import {
  GitcodeClient,
  type Issue,
  type IssueComment,
  type ListIssuesQuery,
  type IssueCommentsQuery,
  isNotModified,
} from '@xbghc/gitcode-api';
import { BaseWatcher, type WatcherOptions } from './common.js';

export interface WatchIssueOptions extends WatcherOptions {
  issueQuery?: ListIssuesQuery;
  commentQuery?: IssueCommentsQuery;
}

type LastSeenComment = Set<number>;

type WatcherState = {
  lastCommentByIssue: Map<number, LastSeenComment>;
};

type PersistShape = {
  lastCommentByIssue: Record<string, number[]>;
};

export class IssueWatcher extends BaseWatcher<WatchIssueOptions, WatcherState, PersistShape> {
  constructor(client: GitcodeClient, url: string, options: WatchIssueOptions = {}) {
    super(client, url, options);
  }

  public getLastCommentId(issueNumber: number): number | undefined {
    const commentIds = this.state.lastCommentByIssue.get(issueNumber);
    if (!commentIds || commentIds.size === 0) return undefined;
    return Math.max(...commentIds);
  }

  protected getStoreSubDir(): string {
    return 'issues';
  }

  protected getInitialState(): WatcherState {
    return { lastCommentByIssue: new Map() };
  }

  protected fromPersisted(persisted: PersistShape): WatcherState {
    const lastMap = new Map<number, LastSeenComment>();
    for (const [key, value] of Object.entries(persisted.lastCommentByIssue ?? {})) {
      const num = Number(key);
      if (!Number.isNaN(num) && Array.isArray(value)) {
        const commentIds = value.filter((id) => typeof id === 'number' && !isNaN(id));
        lastMap.set(num, new Set(commentIds));
      }
    }
    return { lastCommentByIssue: lastMap };
  }

  protected toPersisted(state: WatcherState): PersistShape {
    return {
      lastCommentByIssue: Object.fromEntries(
        Array.from(state.lastCommentByIssue.entries()).map(([key, value]) => [
          key,
          Array.from(value),
        ]),
      ),
    };
  }

  protected async poll(): Promise<void> {
    const issues = await this.fetchIssues();
    await this.detectNewComments(issues);
  }

  private async detectNewComments(issues: Issue[]): Promise<void> {
    this.emitEvent('issue-watcher:detect:start', { phase: 'start' });

    for (const issue of issues) {
      const issueNumber = Number(issue.number);
      if (!Number.isFinite(issueNumber)) continue;

      let result: { data: IssueComment[]; notModified: boolean };
      try {
        result = await this.fetchIssueComments(issueNumber);
      } catch (err) {
        this.emitEvent('issue-watcher:comments:fetch:failed', { error: err, issueNumber });
        continue;
      }

      const { data: comments, notModified } = result;
      const existingLastSeen = this.state.lastCommentByIssue.get(issueNumber);

      if (notModified) {
        if (!existingLastSeen) {
          this.state.lastCommentByIssue.set(issueNumber, new Set(comments.map((c) => c.id)));
        }
        continue;
      }

      if (comments.length === 0) {
        if (!existingLastSeen) {
          this.state.lastCommentByIssue.set(issueNumber, new Set());
        }
        continue;
      }

      const currentCommentIds = new Set(comments.map((comment) => comment.id));

      if (!existingLastSeen) {
        this.state.lastCommentByIssue.set(issueNumber, currentCommentIds);
        continue;
      }

      const newCommentIds = new Set<number>();
      for (const commentId of currentCommentIds) {
        if (!existingLastSeen.has(commentId)) {
          newCommentIds.add(commentId);
        }
      }

      if (newCommentIds.size > 0) {
        const newComments = comments.filter((comment) => newCommentIds.has(comment.id));
        newComments.sort((a, b) => a.id - b.id);

        for (const comment of newComments) {
          this.emitEvent('issue:comment:created', { issue, comment });
        }
      }

      this.state.lastCommentByIssue.set(issueNumber, currentCommentIds);
    }

    this.emitEvent('issue-watcher:detect:complete', { phase: 'complete' });
  }

  private async fetchIssues(): Promise<Issue[]> {
    const query = this.options.issueQuery ?? { state: 'all', page: 1, per_page: 20 };
    return this.client.issue.list(this.url, query);
  }

  private async fetchIssueComments(
    issueNumber: number,
  ): Promise<{ data: IssueComment[]; notModified: boolean }> {
    const query = this.options.commentQuery;
    const data = await this.client.issue.comments(this.url, issueNumber, query ?? {});
    return { data, notModified: isNotModified(data) };
  }
}

export function watchIssues(
  client: GitcodeClient,
  url: string,
  options: WatchIssueOptions = {},
): IssueWatcher {
  return new IssueWatcher(client, url, options);
}
