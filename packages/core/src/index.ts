/**
 * GitAny Core Package
 *
 */

export { watchPullRequest } from './pr/watcher';
export { watchIssues } from './issue/watcher';
export { watchAiMentions, defaultPromptBuilder } from './issue/ai-mentions';
export type { WatchIssueOptions, WatchIssueHandle } from './issue/watcher';
export type {
  WatchAiMentionsOptions,
  AiMentionWatcherHandle,
  AiMentionContext,
  AiMentionSource,
} from './issue/ai-mentions';
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
} from './container';
export type { ProjectCheckResult, ChatOptions, ChatResult } from './container';
