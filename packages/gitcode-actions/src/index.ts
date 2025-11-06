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
export type { StateSerializer } from './watcher/state-serializer.js';
export { createSmartSerializer } from './watcher/state-serializer.js';
export { FileStateStorage } from './watcher/file-state-storage.js';
export { MemoryStateStorage } from './watcher/memory-state-storage.js';

// ===== Container Management =====
// New API (recommended)
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
  prepare,
  resetContainer,
  exec,
} from './container/index.js';
export type {
  CreateContainerConfig,
  CreateContainerResult,
  ContainerInfo,
  PrepareTarget,
  ResetContainerOptions,
  ExecOptions,
  ExecResult,
} from './container/index.js';

// Legacy API (deprecated)
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
  ProjectCheckResult,
  ProjectDiagnostics,
  StepOptions,
  StepResult as ContainerStepResult,
  StepExecutionError as ContainerStepExecutionError,
  VerifyOptions,
  VerifyResult,
} from './executor/index.js';

// ===== Workflows =====
export { chat, createApiCallScript, testShaBuild } from './workflows/index.js';
export type {
  ChatOptions,
  ChatResult,
  CreateApiCallScriptOptions,
  TestShaBuildOptions,
  TestShaBuildResult,
} from './workflows/index.js';
