import type { Issue, IssueComment, PRComment, PullRequest } from '@xbghc/gitcode-api';
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
 * Mention 相关事件
 */
export interface MentionDetectedEventData extends BaseEventData {
  issueNumber: number;
  commentId: number;
  source: 'issue_comment' | 'pr_review_comment';
}

export interface MentionIssueDetailEventData extends BaseEventData {
  issueNumber: number;
  error?: unknown;
}

export interface MentionCommentsLoadEventData extends BaseEventData {
  issueNumber: number;
  error: unknown;
}

export interface MentionPrDetailMissingEventData extends BaseEventData {
  issueNumber: number;
  commentId: number;
}

// 回复被禁用事件（无额外数据）
export type MentionReplyDisabledEventData = BaseEventData;

export interface MentionBackgroundChatFailedEventData extends BaseEventData {
  error: unknown;
  issueNumber: number;
  commentId: number;
}

export interface MentionPlaceholderEventData extends BaseEventData {
  issueNumber: number;
  originalCommentId?: number;
  placeholderCommentId?: number;
  error?: unknown;
  commentId?: number;
}

export interface MentionPromptEmptyEventData extends BaseEventData {
  issueNumber: number;
}

export interface MentionChatCompletedEventData extends BaseEventData {
  issueNumber: number;
  commentId: number;
}

export interface MentionReplyGeneratedEventData extends BaseEventData {
  replyBody: string;
}

export interface MentionReplyEmptyEventData extends BaseEventData {
  issueNumber: number;
  commentId: number;
}

export interface MentionReplyEditedEventData extends BaseEventData {
  issueNumber: number;
  originalCommentId: number;
  finalCommentId: number;
}

export interface MentionBackgroundTaskFailedEventData extends BaseEventData {
  error: unknown;
  issueNumber: number;
  commentId: number;
  prompt?: string;
}

export interface MentionPlaceholderUpdateFailedEventData extends BaseEventData {
  error: unknown;
  issueNumber: number;
  commentId: number;
}

export interface MentionWatcherStopFailedEventData extends BaseEventData {
  error: unknown;
  watcherType: 'issue' | 'pr';
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

  // Mention 事件
  'mention:detected': MentionDetectedEventData;
  'mention:issue-detail:load:failed': MentionIssueDetailEventData;
  'mention:issue-detail:missing': MentionIssueDetailEventData;
  'mention:comments:load:warn': MentionCommentsLoadEventData;
  'mention:pr-detail:missing': MentionPrDetailMissingEventData;
  'mention:reply:disabled': MentionReplyDisabledEventData;
  'mention:background-chat:failed': MentionBackgroundChatFailedEventData;
  'mention:placeholder:created': MentionPlaceholderEventData;
  'mention:placeholder:create:failed': MentionPlaceholderEventData;
  'mention:prompt:empty:warn': MentionPromptEmptyEventData;
  'mention:chat:completed': MentionChatCompletedEventData;
  'mention:reply:generated': MentionReplyGeneratedEventData;
  'mention:reply:empty:warn': MentionReplyEmptyEventData;
  'mention:reply:edited': MentionReplyEditedEventData;
  'mention:background-task:failed': MentionBackgroundTaskFailedEventData;
  'mention:placeholder:update:failed': MentionPlaceholderUpdateFailedEventData;
  'mention:watcher:stop:failed': MentionWatcherStopFailedEventData;

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
