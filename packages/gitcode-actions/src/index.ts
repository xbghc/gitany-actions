/**
 * GitCode Actions Core Package
 *
 */

// Event types
export type { EventDataMap, EventName } from './types/events.js';

// ============ Watchers (New API) ============
export { watch } from './watcher/index.js';
export type {
  Watcher,
  WatchOptions,
  PrWatchConfig,
  IssueWatchConfig,
  WatcherStatus,
} from './watcher/types.js';

// Storage interfaces (Advanced usage)
export type { StateStorage } from './watcher/state-storage.js';
export { FileStateStorage } from './watcher/file-state-storage.js';
export { MemoryStateStorage } from './watcher/memory-state-storage.js';

// Runner Types
export type {
  Runner,
  RunnerRegisterRequest,
  RunnerRegisterResponse,
  JobRequest,
  RunnerJob,
  WorkflowJob,
  ChatJob,
  JobUpdate,
  WorkflowJobPayload,
  ChatJobPayload,
} from './types/runner.js';
export type {
  WorkflowConfigStep,
  WorkflowConfig,
  CreateWorkflowConfigRequest,
  UpdateWorkflowConfigRequest,
} from './types/workflow-config.js';

// ============ Runner Module ============
// Container Management
export {
  createContainer,
  getContainerById,
  findContainers,
  getContainerInfo,
  startContainer,
  stopContainer,
  removeContainer,
  removeContainersByLabels,
  cleanupManagedContainers,
  createRawContainer,
  prepare,
  resetContainer,
  exec,
  copyToContainer,
  CopyToContainerError,
  ImagePullError,
  prepareImage,
} from './runner/container/index.js';
export type {
  CreateContainerConfig,
  CreateContainerResult,
  ContainerInfo,
  PrepareTarget,
  ResetContainerOptions,
  ExecOptions,
  ExecResult,
  ContainerOptions,
  CopyToContainerOptions,
  ImagePullStatus,
} from './runner/container/index.js';

// Container Command Execution
export {
  checkProjectFiles,
  collectDiagnostics,
  ContainerExecutor,
  DiagnosticsCollectionError,
  execCommand,
  executor,
  ExecutorChain,
  verifySha,
} from './runner/executor/index.js';
export type {
  CheckOptions,
  CheckStepResult,
  ExecuteOptions,
  ExecuteResult,
  ExecutionContext,
  ExecutionHandle,
  ExecutionResult,
  ExecutorOptions,
  ProjectCheckResult,
  ProjectDiagnostics,
  StepOptions,
  StepResult as ContainerStepResult,
  StepExecutionError as ContainerStepExecutionError,
  VerifyOptions,
  VerifyResult,
} from './runner/executor/index.js';

// Workflows
export { chat, createApiCallScript, testShaBuild } from './runner/workflows/index.js';
export type {
  ChatOptions,
  ChatResult,
  CreateApiCallScriptOptions,
  TestShaBuildOptions,
  TestShaBuildResult,
} from './runner/workflows/index.js';

// Runner Client & Executor
export { RunnerClient } from './runner/runner-client.js';
export { JobExecutor } from './runner/executor/job-executor.js';
