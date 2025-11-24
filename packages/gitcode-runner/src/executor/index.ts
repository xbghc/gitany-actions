// 核心 API
export { executor, ExecutorChain, ContainerExecutor } from './container-executor.js';
export type {
  ExecutorOptions,
  StepOptions,
  StepResult,
  ExecutionContext,
  ExecutionResult,
  StepExecutionError,
} from './container-executor.js';

// 底层 API
export { execCommand } from './execute-step.js';
export type { ExecuteOptions, ExecuteResult, ExecutionHandle } from './execute-step.js';

// 辅助功能
export { verifySha } from './verify-sha.js';
export type { VerifyOptions, VerifyResult } from './verify-sha.js';

export { checkProjectFiles } from './check-project-files.js';
export type { CheckOptions, CheckStepResult, ProjectCheckResult } from './check-project-files.js';

export { collectDiagnostics, DiagnosticsCollectionError } from './collect-diagnostics.js';
export type { ProjectDiagnostics } from './collect-diagnostics.js';
