import type { EventEmitter } from 'node:events';
import type Docker from 'dockerode';
import type {
  ListIssuesQuery,
  IssueCommentsQuery,
} from '@xbghc/gitcode-api';
import type { EventName, EventDataMap } from '../types/events.js';
import type { ContainerOptions } from '../container/types.js';

/**
 * Watcher 接口
 */
export interface Watcher extends EventEmitter {
  // 生命周期管理
  start(): this;
  stop(): void;
  runOnce(): Promise<void>;

  // 配置管理
  config(): WatchOptions;

  // 状态查询
  isRunning(): boolean;
  getStatus(): WatcherStatus;

  // 事件监听（类型安全）
  on<K extends EventName>(event: K, listener: (data: EventDataMap[K]) => void): this;
  once<K extends EventName>(event: K, listener: (data: EventDataMap[K]) => void): this;
  off<K extends EventName>(event: K, listener: (data: EventDataMap[K]) => void): this;

  // 容器管理（PR 相关）
  getContainers(): Map<number, Docker.Container>;

  // 状态清理
  clearState(resource?: 'pr' | 'issue'): Promise<void>;
}

/**
 * Watcher 配置选项
 */
export interface WatchOptions {
  /** 全局轮询间隔（秒），默认 5 */
  intervalSec?: number;

  /** PR 监听配置 */
  pr?: PrWatchConfig;

  /** Issue 监听配置 */
  issue?: IssueWatchConfig;

  /** Notification 监听配置 */
  notification?: boolean | NotificationWatchConfig;
}

/**
 * PR 监听配置
 */
export interface PrWatchConfig {
  /** 轮询间隔（秒），覆盖全局设置 */
  intervalSec?: number;
  /** 评论类型 */
  commentType?: 'diff_comment' | 'pr_comment';
  /** 容器配置，false 表示禁用容器 */
  container?: ContainerOptions | false;
}

/**
 * Issue 监听配置
 */
export interface IssueWatchConfig {
  /** 轮询间隔（秒），覆盖全局设置 */
  intervalSec?: number;
  /** Issue 查询条件 */
  issueQuery?: ListIssuesQuery;
  /** 评论查询条件 */
  commentQuery?: IssueCommentsQuery;
}

/**
 * Notification 监听配置
 */
export interface NotificationWatchConfig {
  enabled?: boolean;
  /** 轮询间隔（秒），默认 30 */
  intervalSec?: number;
  /** 通知类型筛选 */
  type?: 'all' | 'event' | 'referer';
  /** 是否只显示未读通知，默认 true */
  unread?: boolean;
  /** 是否使用 since 参数优化查询 */
  useSinceParam?: boolean;
}

/**
 * Watcher 状态
 */
export interface WatcherStatus {
  running: boolean;
  resources: {
    pr?: { enabled: boolean; running: boolean; lastPoll?: Date };
    issue?: { enabled: boolean; running: boolean; lastPoll?: Date };
    notification?: { enabled: boolean; running: boolean; lastPoll?: Date };
  };
}

