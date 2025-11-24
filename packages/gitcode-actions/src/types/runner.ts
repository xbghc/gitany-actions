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

export interface RunnerJob {
  id: string;
  workflowId: string;
  type: 'workflow' | 'chat';
  payload: any;
}

export interface JobUpdate {
  runnerId: string;
  token: string;
  status: 'running' | 'success' | 'failed';
  logs?: string;
  error?: string;
  stepName?: string; // Current step name
}
