import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir, resolveGitcodeSubdir, sha1Hex } from '../utils';

const logger = createLogger('@gitany/core');
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

export abstract class BaseWatcher<
  TOptions extends WatcherOptions,
  TState,
  TPersist
> {
  protected readonly client: GitcodeClient;
  protected readonly url: string;
  protected readonly options: TOptions;
  protected state: TState;
  private readonly intervalMs: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(client: GitcodeClient, url: string, options: TOptions) {
    this.client = client;
    this.url = url;
    this.options = options;
    this.intervalMs = 1000 * (options.intervalSec ?? DEFAULT_INTERVAL_SEC);
    this.state = this.loadState();
  }

  public async runOnce(): Promise<void> {
    const startedAt = Date.now();
    const watcherName = this.constructor.name;
    logger.info(`[${watcherName}] runOnce start`);
    try {
      await this.poll();
      await this.persistState();
      logger.info({ durationMs: Date.now() - startedAt }, `[${watcherName}] runOnce complete`);
    } catch (err) {
      logger.error({ err, durationMs: Date.now() - startedAt }, `[${watcherName}] runOnce failed`);
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
      logger.error({ err }, `[BaseWatcher] Failed to read persisted state for ${this.getStoreSubDir()}`);
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
      logger.error({ err }, `[BaseWatcher] Failed to persist state for ${this.getStoreSubDir()}`);
    }
  }
}
