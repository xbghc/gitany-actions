/**
 * GitCode Actions Core Package
 *
 */

// Event types
export type { EventDataMap, EventName } from './types/events.js';

// Watchers
export { IssueWatcher, watchIssues } from './watcher/issue.js';
export type { WatchIssueOptions } from './watcher/issue.js';
export { PullRequestWatcher, watchPullRequest } from './watcher/pr.js';
export type { WatchPullRequestOptions } from './watcher/pr.js';

export { defaultPromptBuilder, runAiMentionsOnce, watchAiMentions } from './ai-mentions/index.js';
export type {
  AiMentionContext,
  AiMentionReply,
  AiMentionSource,
  AiMentionWatcherHandle,
  BuildAiMentionPrompt,
  BuildAiMentionReplyBody,
  WatchAiMentionsOptions,
} from './ai-mentions/index.js';
export {
  chat,
  checkProjectFiles,
  cleanupPrContainers,
  collectDiagnostics,
  ContainerCreationError,
  copyToContainer,
  CopyToContainerError,
  createPrContainer,
  createWorkspaceContainer,
  DiagnosticsCollectionError,
  executeStep,
  getContainer,
  getContainerStatus,
  ImagePullError,
  installDependencies,
  prepareImage,
  removeContainer,
  resetContainer,
  StepExecutionError,
  testShaBuild,
  verifySha,
} from './container/index.js';
export type {
  ChatOptions,
  ChatResult,
  CopyToContainerOptions,
  ProjectCheckResult,
} from './container/index.js';
