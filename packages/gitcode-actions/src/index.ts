/**
 * GitCode Actions Core Package
 *
 */

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
  installCli,
  installClaudeCli,
  installDependencies,
  installGitcodeCli,
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
