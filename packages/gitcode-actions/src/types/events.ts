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
 * AI Mention 相关事件
 */
export interface AiMentionDetectedEventData extends BaseEventData {
  issueNumber: number;
  commentId: number;
  source: 'issue_comment' | 'pr_review_comment';
}

export interface AiMentionIssueDetailEventData extends BaseEventData {
  issueNumber: number;
  error?: unknown;
}

export interface AiMentionCommentsLoadEventData extends BaseEventData {
  issueNumber: number;
  error: unknown;
}

export interface AiMentionPrDetailMissingEventData extends BaseEventData {
  issueNumber: number;
  commentId: number;
}

// 回复被禁用事件（无额外数据）
export type AiMentionReplyDisabledEventData = BaseEventData;

export interface AiMentionBackgroundChatFailedEventData extends BaseEventData {
  error: unknown;
  issueNumber: number;
  commentId: number;
}

export interface AiMentionPlaceholderEventData extends BaseEventData {
  issueNumber: number;
  originalCommentId?: number;
  placeholderCommentId?: number;
  error?: unknown;
  commentId?: number;
}

export interface AiMentionPromptEmptyEventData extends BaseEventData {
  issueNumber: number;
}

export interface AiMentionChatCompletedEventData extends BaseEventData {
  issueNumber: number;
  commentId: number;
}

export interface AiMentionReplyGeneratedEventData extends BaseEventData {
  replyBody: string;
}

export interface AiMentionReplyEmptyEventData extends BaseEventData {
  issueNumber: number;
  commentId: number;
}

export interface AiMentionReplyEditedEventData extends BaseEventData {
  issueNumber: number;
  originalCommentId: number;
  finalCommentId: number;
}

export interface AiMentionBackgroundTaskFailedEventData extends BaseEventData {
  error: unknown;
  issueNumber: number;
  commentId: number;
  prompt?: string;
}

export interface AiMentionPlaceholderUpdateFailedEventData extends BaseEventData {
  error: unknown;
  issueNumber: number;
  commentId: number;
}

export interface AiMentionWatcherStopFailedEventData extends BaseEventData {
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

  // AI Mention 事件
  'ai-mention:detected': AiMentionDetectedEventData;
  'ai-mention:issue-detail:load:failed': AiMentionIssueDetailEventData;
  'ai-mention:issue-detail:missing': AiMentionIssueDetailEventData;
  'ai-mention:comments:load:warn': AiMentionCommentsLoadEventData;
  'ai-mention:pr-detail:missing': AiMentionPrDetailMissingEventData;
  'ai-mention:reply:disabled': AiMentionReplyDisabledEventData;
  'ai-mention:background-chat:failed': AiMentionBackgroundChatFailedEventData;
  'ai-mention:placeholder:created': AiMentionPlaceholderEventData;
  'ai-mention:placeholder:create:failed': AiMentionPlaceholderEventData;
  'ai-mention:prompt:empty:warn': AiMentionPromptEmptyEventData;
  'ai-mention:chat:completed': AiMentionChatCompletedEventData;
  'ai-mention:reply:generated': AiMentionReplyGeneratedEventData;
  'ai-mention:reply:empty:warn': AiMentionReplyEmptyEventData;
  'ai-mention:reply:edited': AiMentionReplyEditedEventData;
  'ai-mention:background-task:failed': AiMentionBackgroundTaskFailedEventData;
  'ai-mention:placeholder:update:failed': AiMentionPlaceholderUpdateFailedEventData;
  'ai-mention:watcher:stop:failed': AiMentionWatcherStopFailedEventData;

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
