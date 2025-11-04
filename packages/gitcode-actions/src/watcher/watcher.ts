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
import { pollNotifications, type NotificationState } from './internal/notification-poller.js';

/**
 * Watcher 主类
 *
 * 统一管理 PR、Issue 等资源的监听
 */
export class Watcher extends EventEmitter implements IWatcher {
  private readonly client: GitcodeClient;
  private readonly url: string;
  private readonly options: WatchOptions;
  private readonly runners = new Map<string, IResourceRunner>();
  private running = false;

  // PR 特定：容器管理
  private readonly containerMap = new Map<number, Docker.Container>();

  // Notification 特定：轮询状态和定时器
  private notificationIntervalId?: NodeJS.Timeout;
  private notificationState: NotificationState = { lastPollTime: undefined };

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

    // 启动 notification 监听
    if (this.options.notification) {
      const config = typeof this.options.notification === 'boolean'
        ? { intervalSec: 30, type: 'referer' as const, unread: true }
        : { intervalSec: 30, type: 'referer' as const, unread: true, ...this.options.notification };

      if (config.enabled !== false) {
        const pollFn = async () => {
          this.notificationState = await pollNotifications(
            this.notificationState,
            { client: this.client, url: this.url },
            this.emitEvent.bind(this),
            { useSinceParam: config.useSinceParam }
          );
        };

        void pollFn(); // 立即执行一次
        this.notificationIntervalId = setInterval(() => void pollFn(), config.intervalSec * 1000);
      }
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

    if (this.notificationIntervalId) {
      clearInterval(this.notificationIntervalId);
      this.notificationIntervalId = undefined;
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
        notification: this.notificationIntervalId
          ? { enabled: true, running: this.running, lastPoll: this.notificationState.lastPollTime }
          : undefined,
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
      // 清理所有资源状态
      for (const runner of this.runners.values()) {
        await runner.clearState();
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
