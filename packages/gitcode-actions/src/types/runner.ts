export interface Runner {
  id: string;
  name: string;
  token: string;
  lastSeen: string; // ISO date
  status: 'online' | 'offline' | 'busy';
  currentJobId?: string;
  ip?: string;
  version?: string;
}

export interface RunnerRegisterRequest {
  name: string;
  version?: string;
}

export interface RunnerRegisterResponse {
  id: string;
  token: string;
}

export interface JobRequest {
  runnerId: string;
  token: string;
}

export interface WorkflowJobPayload {
  workflowId?: string;
  owner?: string;
  repo?: string;
  prNumber?: number;
  repoUrl: string;
  branch: string;
  config: unknown; // WorkflowConfig
  gitcodeToken?: string;
}

export interface ChatJobPayload {
  prompt: string;
  repoUrl?: string;
  context?: unknown;
}

interface RunnerJobBase {
  id: string;
  workflowId: string;
}

export interface WorkflowJob extends RunnerJobBase {
  type: 'workflow';
  payload: WorkflowJobPayload;
}

export interface ChatJob extends RunnerJobBase {
  type: 'chat';
  payload: ChatJobPayload;
}

export type RunnerJob = WorkflowJob | ChatJob;

export interface JobUpdate {
  runnerId: string;
  token: string;
  status: 'running' | 'success' | 'failed';
  logs?: string;
  error?: string;
  stepName?: string; // Current step name
}
