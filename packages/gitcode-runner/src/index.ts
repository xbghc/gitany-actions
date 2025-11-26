/**
 * GitCode Runner Package
 */

// ===== Container Management =====
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
  copyToContainer,
  CopyToContainerError,
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
