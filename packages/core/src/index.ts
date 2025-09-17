/**
 * GitAny Core Package
 *
 */

export { IssueWatcher, watchIssues } from './watcher/issue';
export type { WatchIssueOptions } from './watcher/issue';
export { PullRequestWatcher, watchPullRequest } from './watcher/pr';
export type { WatchPullRequestOptions } from './watcher/pr';

export { defaultPromptBuilder, runAiMentionsOnce, watchAiMentions } from './ai-mentions';
export type {
  AiMentionContext,
  AiMentionReply,
  AiMentionSource,
  AiMentionWatcherHandle,
  BuildAiMentionPrompt,
  BuildAiMentionReplyBody,
  WatchAiMentionsOptions,
} from './ai-mentions';
export {
  chat,
  checkoutSha,
  checkProjectFiles,
  cleanupPrContainers,
  cloneRepo,
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
  installClaudeCli,
  installDependencies,
  installGitcodeCli,
  prepareImage,
  removeContainer,
  resetContainer,
  StepExecutionError,
  testShaBuild,
  verifySha,
} from './container';
export type {
  ChatOptions,
  ChatResult,
  CopyToContainerOptions,
  ProjectCheckResult,
} from './container';
