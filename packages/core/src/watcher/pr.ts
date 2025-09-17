import {
  GitcodeClient,
  type PullRequest,
  type PRComment,
  type PRCommentQueryOptions,
  isNotModified,
} from '@gitany/gitcode';
import type Docker from 'dockerode';
import { createLogger } from '@gitany/shared';
import { createPrContainer, removeContainer, cleanupPrContainers as cleanup } from '../container';
import type { ContainerOptions } from '../container/types';
import { BaseWatcher, type WatcherOptions } from './common';

const logger = createLogger('@gitany/core');

export interface WatchPullRequestOptions extends WatcherOptions {
  onClosed?: (pr: PullRequest) => void;
  onOpen?: (pr: PullRequest) => void;
  onMerged?: (pr: PullRequest) => void;
  onComment?: (pr: PullRequest, comment: PRComment) => void;
  commentType?: 'diff_comment' | 'pr_comment';
  container?: ContainerOptions | false;
  onContainerCreated?: (container: Docker.Container, pr: PullRequest) => void;
  onContainerRemoved?: (prId: number) => void;
}

type BaselinePR = Pick<PullRequest, 'id' | 'number' | 'state'>;

type WatcherState = {
  prList: BaselinePR[];
  lastCommentIdsByPr: Map<number, Set<number>>;
};

type PersistShape = {
  prs: Array<{ id: number; number: number; state: PullRequest['state'] }>;
  lastCommentIdsByPr: Record<string, number[]>;
};

export class PullRequestWatcher extends BaseWatcher<WatchPullRequestOptions, WatcherState, PersistShape> {
  private readonly containerMap = new Map<number, Docker.Container>();

  constructor(client: GitcodeClient, url: string, options: WatchPullRequestOptions = {}) {
    super(client, url, options);
  }

  public getContainers(): Map<number, Docker.Container> {
    return this.containerMap;
  }

  protected getStoreSubDir(): string {
    return 'prs';
  }

  protected getInitialState(): WatcherState {
    return { prList: [], lastCommentIdsByPr: new Map() };
  }

  protected fromPersisted(persisted: PersistShape): WatcherState {
    const lastMap = new Map<number, Set<number>>();
    for (const [k, v] of Object.entries(persisted.lastCommentIdsByPr ?? {})) {
      const num = Number(k);
      if (!Number.isNaN(num) && Array.isArray(v)) {
        const commentIds = v.filter(id => typeof id === 'number' && !isNaN(id));
        lastMap.set(num, new Set(commentIds));
      }
    }
    const prList: BaselinePR[] = (persisted.prs ?? []).map((p) => ({ id: p.id, state: p.state, number: p.number }));
    return { prList, lastCommentIdsByPr: lastMap };
  }

  protected toPersisted(state: WatcherState): PersistShape {
    return {
      prs: state.prList.map((p) => ({ id: p.id, state: p.state, number: p.number })),
      lastCommentIdsByPr: Object.fromEntries(
        Array.from(state.lastCommentIdsByPr.entries()).map(([key, value]) => [
          key,
          Array.from(value),
        ])
      ),
    };
  }

  protected async poll(): Promise<void> {
    const { data: currentList, notModified } = await this.fetchPullRequests();
    if (!notModified) {
      await this.detectStateChanges(currentList);
      this.state.prList = currentList.map((p) => ({ id: p.id, number: p.number, state: p.state }));
    }
    await this.detectNewComments(currentList);
  }

  private async fetchPullRequests(): Promise<{ data: PullRequest[]; notModified: boolean }> {
    const data = await this.client.pr.list(this.url, { state: 'all', page: 1, per_page: 10 });
    return { data, notModified: isNotModified(data) };
  }

  private async detectStateChanges(newList: PullRequest[]): Promise<void> {
    const prev = this.state.prList;
    for (const pr of newList) {
      const existed = prev.find((p) => p.id === pr.id);
      if (!existed || existed.state !== pr.state) {
        await this.triggerPullRequestEvent(pr);
      }
    }
  }

  private async detectNewComments(newList: PullRequest[]): Promise<void> {
    if (!this.options.onComment) return;

    for (const pr of newList) {
      if (pr.state !== 'open') continue;

      const { data: comments, notModified } = await this.fetchPrComments(pr.number);
      const existingLastSeen = this.state.lastCommentIdsByPr.get(pr.number);

      if (notModified) {
        if (!existingLastSeen) {
          this.state.lastCommentIdsByPr.set(pr.number, new Set(comments.map(c => c.id)));
        }
        continue;
      }

      if (!comments.length) {
        if (!existingLastSeen) {
          this.state.lastCommentIdsByPr.set(pr.number, new Set());
        }
        continue;
      }

      const currentCommentIds = new Set(comments.map(c => c.id));
      if (!existingLastSeen) {
        this.state.lastCommentIdsByPr.set(pr.number, currentCommentIds);
        continue;
      }

      const newCommentIds = new Set(comments.filter(c => !existingLastSeen.has(c.id)).map(c => c.id));
      if (newCommentIds.size > 0) {
        const newComments = comments.filter(c => newCommentIds.has(c.id)).sort((a, b) => a.id - b.id);
        for (const comment of newComments) {
          this.options.onComment?.(pr, comment);
        }
      }
      this.state.lastCommentIdsByPr.set(pr.number, currentCommentIds);
    }
  }

  private async fetchPrComments(prNumber: number): Promise<{ data: PRComment[]; notModified: boolean }> {
    const query: PRCommentQueryOptions | undefined =
      this.options.commentType ? { comment_type: this.options.commentType } : undefined;
    const data = await this.client.pr.comments(this.url, prNumber, query);
    return { data, notModified: isNotModified(data) };
  }

  private async triggerPullRequestEvent(pr: PullRequest): Promise<void> {
    const { onClosed, onMerged, onOpen, container, onContainerCreated, onContainerRemoved } = this.options;
    const handleContainer = container !== false && container !== undefined;

    if (pr.state === 'open') {
      if (handleContainer) {
        const created = await createPrContainer(this.url, pr, container || {});
        this.containerMap.set(pr.id, created);
        onContainerCreated?.(created, pr);
      }
      onOpen?.(pr);
    } else if (pr.state === 'closed' || pr.state === 'merged') {
      if (handleContainer) {
        await removeContainer(pr.id);
        this.containerMap.delete(pr.id);
        onContainerRemoved?.(pr.id);
      }
      if (pr.state === 'closed') onClosed?.(pr);
      if (pr.state === 'merged') onMerged?.(pr);
    }
  }
}

export function watchPullRequest(
  client: GitcodeClient,
  url: string,
  options: WatchPullRequestOptions = {},
): PullRequestWatcher {
  return new PullRequestWatcher(client, url, options);
}

export const cleanupPrContainers = cleanup;
