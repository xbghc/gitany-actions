import type { Issue, IssueComment, Notification, PRComment, PullRequest } from '@xbghc/gitcode-api';
import type Docker from 'dockerode';

/**
 * 基础事件数据接口
 */
export interface BaseEventData {
  timestamp: Date;
}

/**
 * PR 相关事件
 */
export interface PrEventData extends BaseEventData {
  pr: PullRequest;
}

export interface PrCommentEventData extends BaseEventData {
  pr: PullRequest;
  comment: PRComment;
}

/**
 * Issue 相关事件
 */
export interface IssueEventData extends BaseEventData {
  issue: Issue;
}

export interface IssueCommentEventData extends BaseEventData {
  issue: Issue;
  comment: IssueComment;
}

/**
 * 容器相关事件
 */
export interface ContainerCreatedEventData extends BaseEventData {
  container: Docker.Container;
  pr: PullRequest;
}

export interface ContainerRemovedEventData extends BaseEventData {
  prId: number;
}

export interface ContainerListedEventData extends BaseEventData {
  containerId: string;
  containerName: string;
  prId: number;
}

export interface ContainerCleanupRemovedEventData extends BaseEventData {
  id: string;
  state: string;
}

/**
 * Watcher 生命周期事件
 */
export interface WatcherPollStartEventData extends BaseEventData {
  watcher: string;
}

export interface WatcherPollCompleteEventData extends BaseEventData {
  watcher: string;
  durationMs: number;
}

export interface WatcherPollFailedEventData extends BaseEventData {
  watcher: string;
  error: unknown;
  durationMs: number;
}

/**
 * Watcher 状态事件
 */
export interface WatcherStateEventData extends BaseEventData {
  watcher: string;
  subDir: string;
  error?: unknown;
}

/**
 * Issue Watcher 事件
 */
export interface IssueWatcherDetectEventData extends BaseEventData {
  phase: 'start' | 'complete';
}

export interface IssueWatcherFetchFailedEventData extends BaseEventData {
  error: unknown;
  issueNumber: number;
}

/**
 * 通知相关事件
 */
export interface NotificationDetectedEventData extends BaseEventData {
  notification: Notification;
  owner: string;
  repo: string;
}

export interface NotificationPollFailedEventData extends BaseEventData {
  error: unknown;
  owner: string;
  repo: string;
}

export interface NotificationMarkedReadEventData extends BaseEventData {
  notificationId: string;
}

export interface NotificationMarkReadFailedEventData extends BaseEventData {
  error: unknown;
  notificationId: string;
}

export interface NotificationUrlParseFailedEventData extends BaseEventData {
  htmlUrl: string;
}

export interface NotificationCommentLoadFailedEventData extends BaseEventData {
  notificationId: string;
  resourceType: 'issue' | 'pull';
  resourceNumber: number;
}

/**
 * 容器清理事件
 */
export interface ContainerCleanupStartedEventData extends BaseEventData {
  count: number;
}

export interface ContainerCleanupRemoveFailedEventData extends BaseEventData {
  error: unknown;
  id: string;
}

/**
 * 事件数据类型映射
 */
export interface EventDataMap {
  // PR 事件
  'pr:opened': PrEventData;
  'pr:closed': PrEventData;
  'pr:merged': PrEventData;
  'pr:comment:created': PrCommentEventData;

  // Issue 事件
  'issue:comment:created': IssueCommentEventData;

  // 容器事件
  'container:created': ContainerCreatedEventData;
  'container:removed': ContainerRemovedEventData;

  // Watcher 生命周期事件
  'watcher:poll:start': WatcherPollStartEventData;
  'watcher:poll:complete': WatcherPollCompleteEventData;
  'watcher:poll:failed': WatcherPollFailedEventData;

  // Watcher 状态事件
  'watcher:state:load:failed': WatcherStateEventData;
  'watcher:state:persist:failed': WatcherStateEventData;

  // Issue Watcher 事件
  'issue-watcher:detect:start': IssueWatcherDetectEventData;
  'issue-watcher:detect:complete': IssueWatcherDetectEventData;
  'issue-watcher:comments:fetch:failed': IssueWatcherFetchFailedEventData;

  // 通知事件
  'notification:detected': NotificationDetectedEventData;
  'notification:poll:failed': NotificationPollFailedEventData;
  'notification:marked:read': NotificationMarkedReadEventData;
  'notification:mark-read:failed': NotificationMarkReadFailedEventData;
  'notification:url:parse:failed': NotificationUrlParseFailedEventData;
  'notification:comment:load:failed': NotificationCommentLoadFailedEventData;

  // 容器清理事件
  'container:cleanup:started': ContainerCleanupStartedEventData;
  'container:cleanup:listed': ContainerListedEventData;
  'container:cleanup:removed': ContainerCleanupRemovedEventData;
  'container:cleanup:stale:removed': ContainerCleanupRemovedEventData;
  'container:cleanup:remove:failed': ContainerCleanupRemoveFailedEventData;
}

/**
 * 事件名称类型
 */
export type EventName = keyof EventDataMap;
