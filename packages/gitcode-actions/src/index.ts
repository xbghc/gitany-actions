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

// ===== Container Management =====
export {
  cleanupPrContainers,
  ContainerCreationError,
  copyToContainer,
  CopyToContainerError,
  createPrContainer,
  createWorkspaceContainer,
  getContainer,
  getContainerStatus,
  ImagePullError,
  prepareImage,
  removeContainer,
  resetContainer,
} from './container/index.js';
export type {
  ContainerOptions,
  CopyToContainerOptions,
  ImagePullStatus,
} from './container/index.js';

// ===== Container Command Execution =====
export {
  checkProjectFiles,
  collectDiagnostics,
  ContainerExecutor,
  DiagnosticsCollectionError,
  execCommand,
  executor,
  ExecutorChain,
  installDependencies,
  verifySha,
} from './executor/index.js';
export type {
  CheckOptions,
  CheckStepResult,
  ExecuteOptions,
  ExecuteResult,
  ExecutionContext,
  ExecutionHandle,
  ExecutionResult,
  ExecutorOptions,
  InstallOptions,
  InstallResult,
  ProjectCheckResult,
  ProjectDiagnostics,
  StepOptions,
  StepResult as ContainerStepResult,
  StepExecutionError as ContainerStepExecutionError,
  VerifyOptions,
  VerifyResult,
} from './executor/index.js';

// ===== Workflows =====
export {
  chat,
  createApiCallScript,
  testShaBuild,
} from './workflows/index.js';
export type {
  ChatOptions,
  ChatResult,
  CreateApiCallScriptOptions,
  TestShaBuildOptions,
  TestShaBuildResult,
} from './workflows/index.js';
