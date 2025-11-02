import { GitcodeClient } from '@xbghc/gitcode-api';
import { EventEmitter } from 'node:events';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir, resolveGitcodeSubdir, sha1Hex } from '../utils/index.js';
import type { EventDataMap, EventName } from '../types/events.js';

const DEFAULT_INTERVAL_SEC = 5;

export interface WatcherOptions {
  intervalSec?: number;
}

export interface WatcherHandle {
  stop(): void;
}

export function urlKey(url: string) {
  return sha1Hex(url);
}

export function getWatcherStoreDir(subDir: string): string {
  return path.join(resolveGitcodeSubdir('watchers'), subDir);
}

export abstract class BaseWatcher<TOptions extends WatcherOptions, TState, TPersist>
  extends EventEmitter
{
  protected readonly client: GitcodeClient;
  protected readonly url: string;
  protected readonly options: TOptions;
  protected state: TState;
  private readonly intervalMs: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(client: GitcodeClient, url: string, options: TOptions) {
    super();
    this.client = client;
    this.url = url;
    this.options = options;
    this.intervalMs = 1000 * (options.intervalSec ?? DEFAULT_INTERVAL_SEC);
    this.state = this.loadState();
  }

  /**
   * 类型安全的事件发射方法
   */
  protected emitEvent<K extends EventName>(event: K, data: Omit<EventDataMap[K], 'timestamp'>): void {
    const eventData = { ...data, timestamp: new Date() } as EventDataMap[K];
    this.emit(event, eventData);
  }

  public async runOnce(): Promise<void> {
    const startedAt = Date.now();
    const watcherName = this.constructor.name;
    this.emitEvent('watcher:poll:start', { watcher: watcherName });
    try {
      await this.poll();
      await this.persistState();
      this.emitEvent('watcher:poll:complete', {
        watcher: watcherName,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      this.emitEvent('watcher:poll:failed', {
        watcher: watcherName,
        error: err,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  public start(): this {
    if (this.intervalId) {
      return this;
    }

    // 立即轮询一次，以便尽早建立基线
    void this.runOnce();
    this.intervalId = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);

    return this;
  }

  public stop(): void {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  protected abstract poll(): Promise<void>;
  protected abstract getStoreSubDir(): string;
  protected abstract fromPersisted(persisted: TPersist): TState;
  protected abstract toPersisted(state: TState): TPersist;
  protected abstract getInitialState(): TState;

  protected getStoreFile(): string {
    const dir = getWatcherStoreDir(this.getStoreSubDir());
    return path.join(dir, `${urlKey(this.url)}.json`);
  }

  private loadState(): TState {
    try {
      const file = this.getStoreFile();
      if (!fsSync.existsSync(file)) return this.getInitialState();
      const raw = fsSync.readFileSync(file, 'utf8');
      if (!raw) return this.getInitialState();
      const data = JSON.parse(raw) as TPersist;
      return this.fromPersisted(data);
    } catch (err) {
      this.emitEvent('watcher:state:load:failed', {
        watcher: this.constructor.name,
        subDir: this.getStoreSubDir(),
        error: err,
      });
      return this.getInitialState();
    }
  }

  protected async persistState(): Promise<void> {
    try {
      const dir = getWatcherStoreDir(this.getStoreSubDir());
      await ensureDir(dir);
      const file = this.getStoreFile();
      const data = this.toPersisted(this.state);
      await fs.writeFile(file, JSON.stringify(data), 'utf8');
    } catch (err) {
      this.emitEvent('watcher:state:persist:failed', {
        watcher: this.constructor.name,
        subDir: this.getStoreSubDir(),
        error: err,
      });
    }
  }
}
