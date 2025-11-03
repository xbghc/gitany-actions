import { GitcodeClient } from '@xbghc/gitcode-api';
import { EventEmitter } from 'node:events';
import type Docker from 'dockerode';
import type {
  Watcher as IWatcher,
  WatchOptions,
  WatcherStatus,
} from './types.js';
import type { EventName, EventDataMap } from '../types/events.js';
import { ResourceRunner, type IResourceRunner } from './internal/resource-runner.js';
import {
  pollPullRequests,
  getInitialPrState,
  type PrState,
} from './internal/pr-poller.js';
import {
  pollIssues,
  getInitialIssueState,
  type IssueState,
} from './internal/issue-poller.js';
import { watchMentions } from '../workflows/mention-watcher.js';
import type { MentionWatcherHandle } from '../workflows/mention-types.js';

/**
 * Watcher 主类
 *
 * 统一管理 PR、Issue、Mention 等资源的监听
 */
export class Watcher extends EventEmitter implements IWatcher {
  private readonly client: GitcodeClient;
  private readonly url: string;
  private readonly options: WatchOptions;
  private readonly runners = new Map<string, IResourceRunner>();
  private running = false;

  // PR 特定：容器管理
  private readonly containerMap = new Map<number, Docker.Container>();

  // Mention 特定：handle
  private mentionHandle?: MentionWatcherHandle;

  constructor(client: GitcodeClient, url: string, options: WatchOptions = {}) {
    super();
    this.client = client;
    this.url = url;
    this.options = options;

    this.initializeRunners();
  }

  /**
   * 初始化资源执行器
   */
  private initializeRunners(): void {
    const context = { client: this.client, url: this.url };
    const emitFn = this.emitEvent.bind(this);

    // PR Runner
    if (this.options.pr) {
      const intervalSec = this.options.pr.intervalSec ?? this.options.intervalSec;

      const runner = new ResourceRunner<PrState>(
        'pr',
        getInitialPrState,
        (state, ctx, emit) =>
          pollPullRequests(state, ctx, emit, {
            commentType: this.options.pr!.commentType,
          }),
        context,
        emitFn,
        intervalSec,
      );

      this.runners.set('pr', runner);
    }

    // Issue Runner
    if (this.options.issue) {
      const intervalSec = this.options.issue.intervalSec ?? this.options.intervalSec;

      const runner = new ResourceRunner<IssueState>(
        'issue',
        getInitialIssueState,
        (state, ctx, emit) =>
          pollIssues(state, ctx, emit, {
            issueQuery: this.options.issue!.issueQuery,
            commentQuery: this.options.issue!.commentQuery,
          }),
        context,
        emitFn,
        intervalSec,
      );

      this.runners.set('issue', runner);
    }

    // Mention（已废弃）
    if (this.options.mention && typeof this.options.mention !== 'boolean') {
      console.warn(
        '[DEPRECATED] Mention watcher 已废弃。' +
          '未来版本将通过个人通知 API 实现 mention 功能。',
      );

      this.mentionHandle = watchMentions(this.client, this.url, {
        mention: this.options.mention.mention,
        issueIntervalSec: this.options.mention.issueIntervalSec,
        prIntervalSec: this.options.mention.prIntervalSec,
        chatOptions: this.options.mention.chatOptions,
        buildPrompt: this.options.mention.buildPrompt,
        buildReplyBody: this.options.mention.buildReplyBody,
        includeIssueComments: this.options.mention.includeIssueComments,
        includePullRequestComments: this.options.mention.includePullRequestComments,
        replyWithComment: this.options.mention.replyWithComment,
      });

      // 转发 mention 事件
      this.mentionHandle.on('*', (event: string, data: unknown) => {
        this.emit(event, data);
      });
    }
  }

  /**
   * 类型安全的事件发射
   */
  protected emitEvent<K extends EventName>(
    event: K,
    data: Omit<EventDataMap[K], 'timestamp'>,
  ): void {
    const eventData = { ...data, timestamp: new Date() } as EventDataMap[K];
    this.emit(event, eventData);
  }

  /**
   * 获取当前配置
   */
  config(): WatchOptions {
    return this.options;
  }

  /**
   * 启动所有资源
   */
  start(): this {
    if (this.running) return this;
    this.running = true;

    for (const runner of this.runners.values()) {
      runner.start();
    }

    return this;
  }

  /**
   * 停止所有资源
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const runner of this.runners.values()) {
      runner.stop();
    }

    if (this.mentionHandle) {
      this.mentionHandle.stop();
    }
  }

  /**
   * 手动触发一次轮询
   */
  async runOnce(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const runner of this.runners.values()) {
      promises.push(runner.runOnce());
    }
    await Promise.all(promises);
  }

  /**
   * 查询是否正在运行
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * 获取状态
   */
  getStatus(): WatcherStatus {
    return {
      running: this.running,
      resources: {
        pr: this.runners.has('pr') ? { enabled: true, running: this.running } : undefined,
        issue: this.runners.has('issue') ? { enabled: true, running: this.running } : undefined,
        mention: this.mentionHandle ? { enabled: true, running: this.running } : undefined,
      },
    };
  }

  /**
   * 获取 PR 容器
   */
  getContainers(): Map<number, Docker.Container> {
    return this.containerMap;
  }

  /**
   * 清理状态
   */
  async clearState(resource?: 'pr' | 'issue'): Promise<void> {
    if (resource) {
      const runner = this.runners.get(resource);
      if (runner) {
        await runner.clearState();
      }
    } else {
      // 清理所有状态（不包括已废弃的 mention）
      for (const [name, runner] of this.runners.entries()) {
        if (name !== 'mention') {
          await runner.clearState();
        }
      }
    }
  }

  /**
   * 类型安全的事件监听
   */
  on<K extends EventName>(event: K, listener: (data: EventDataMap[K]) => void): this {
    return super.on(event, listener);
  }

  /**
   * 类型安全的一次性事件监听
   */
  once<K extends EventName>(event: K, listener: (data: EventDataMap[K]) => void): this {
    return super.once(event, listener);
  }

  /**
   * 类型安全的事件移除
   */
  off<K extends EventName>(event: K, listener: (data: EventDataMap[K]) => void): this {
    return super.off(event, listener);
  }
}
