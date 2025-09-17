/**
 * GitAny Core Package
 *
 */

export { watchIssues, IssueWatcher } from './watcher/issue';
export type { WatchIssueOptions } from './watcher/issue';
export { watchPullRequest, PullRequestWatcher, cleanupPrContainers } from './watcher/pr';
export type { WatchPullRequestOptions } from './watcher/pr';

export { watchAiMentions, defaultPromptBuilder } from './ai-mentions';
export type {
  WatchAiMentionsOptions,
  AiMentionWatcherHandle,
  AiMentionContext,
  AiMentionSource,
  AiMentionReply,
  BuildAiMentionPrompt,
  BuildAiMentionReplyBody,
} from './ai-mentions';
export {
  createPrContainer,
  resetContainer,
  removeContainer,
  getContainer,
  getContainerStatus,
  testShaBuild,
  cloneRepo,
  verifySha,
  checkoutSha,
  checkProjectFiles,
  installDependencies,
  installClaudeCli,
  installGitcodeCli,
  chat,
  prepareImage,
  DockerUnavailableError,
  ImagePullError,
  createWorkspaceContainer,
  ContainerCreationError,
  executeStep,
  StepExecutionError,
  collectDiagnostics,
  DiagnosticsCollectionError,
  cleanupPrContainers,
  copyToContainer,
  CopyToContainerError,
} from './container';
export type {
  ProjectCheckResult,
  ChatOptions,
  ChatResult,
  CopyToContainerOptions,
} from './container';
