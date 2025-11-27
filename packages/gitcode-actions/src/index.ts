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
