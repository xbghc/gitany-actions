import type { GitcodeClient } from '@xbghc/gitcode-api';
import { getRepoStateDir } from '../../utils/index.js';
import type { EventDataMap, EventName } from '../../types/events.js';
import { FileStateStorage } from '../file-state-storage.js';
import type { StateStorage } from '../state-storage.js';
import { createSmartSerializer, type StateSerializer } from '../state-serializer.js';

const DEFAULT_INTERVAL_SEC = 5;

/**
 * 事件发射函数类型
 */
export type EmitFn = <K extends EventName>(
  event: K,
  data: Omit<EventDataMap[K], 'timestamp'>,
) => void;

/**
 * 资源执行器接口（非泛型）
 * 用于在 Map 中存储不同类型的 ResourceRunner
 */
export interface IResourceRunner {
  start(): void;
  stop(): void;
  runOnce(): Promise<void>;
  clearState(): Promise<void>;
}

/**
 * 轮询上下文
 */
export interface PollContext {
  client: GitcodeClient;
  url: string;
}

/**
 * 轮询函数类型
 *
 * @param state - 当前状态
 * @param context - 轮询上下文
 * @param emit - 事件发射函数
 * @returns 新状态
 */
export type PollFn<TState> = (
  state: TState,
  context: PollContext,
  emit: EmitFn,
) => Promise<TState>;

/**
 * 资源执行器 - 通用的轮询和状态管理
 *
 * @internal 内部使用，不导出到公共 API
 */
export class ResourceRunner<TState> implements IResourceRunner {
  private state: TState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly storage: StateStorage<TState>;
  private readonly storageKey: string;
  private readonly intervalMs: number;

  constructor(
    private readonly type: string,
    private readonly getInitialState: () => TState,
    private readonly pollFn: PollFn<TState>,
    private readonly context: PollContext,
    private readonly emitFn: EmitFn,
    intervalSec?: number,
    serializer: StateSerializer<TState> = createSmartSerializer(),
  ) {
    this.intervalMs = 1000 * (intervalSec ?? DEFAULT_INTERVAL_SEC);
    this.storageKey = getRepoStateDir(context.url);
    this.storage = new FileStateStorage(type, serializer);
    this.state = this.loadState();
  }

  /**
   * 启动轮询
   */
  start(): void {
    if (this.intervalId) {
      return;
    }

    // 立即执行一次
    void this.runOnce();

    // 设置定时器
    this.intervalId = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
  }

  /**
   * 停止轮询
   */
  stop(): void {
    if (!this.intervalId) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  /**
   * 手动执行一次轮询
   */
  async runOnce(): Promise<void> {
    const startedAt = Date.now();

    try {
      // 执行轮询，获取新状态
      this.state = await this.pollFn(this.state, this.context, this.emitFn);

      // 持久化状态
      await this.persistState();

      // 发射成功事件
      this.emitFn('watcher:poll:complete', {
        watcher: this.type,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      // 发射失败事件
      this.emitFn('watcher:poll:failed', {
        watcher: this.type,
        error: err,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  /**
   * 清理状态
   */
  async clearState(): Promise<void> {
    if (this.storage.delete) {
      await this.storage.delete(this.storageKey);
    }
    this.state = this.getInitialState();
  }

  /**
   * 加载状态
   */
  private loadState(): TState {
    try {
      const state = this.storage.load(this.storageKey);
      return state ?? this.getInitialState();
    } catch (err) {
      this.emitFn('watcher:state:load:failed', {
        watcher: this.type,
        subDir: this.type,
        error: err,
      });
      return this.getInitialState();
    }
  }

  /**
   * 持久化状态
   */
  private async persistState(): Promise<void> {
    try {
      await this.storage.save(this.storageKey, this.state);
    } catch (err) {
      this.emitFn('watcher:state:persist:failed', {
        watcher: this.type,
        subDir: this.type,
        error: err,
      });
    }
  }
}
