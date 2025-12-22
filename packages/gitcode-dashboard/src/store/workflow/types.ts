/** Workflow 执行状态 */
export type WorkflowStatus = 'pending' | 'running' | 'success' | 'failed';

/** Workflow 执行步骤 */
export interface WorkflowStep {
  name: string;
  status: WorkflowStatus;
  output?: string;
  startTime?: string;
  endTime?: string;
}

/** Workflow 执行结果 */
export interface WorkflowResult {
  workflowId: string;
  owner: string;
  repo: string;
  repoUrl: string;
  prNumber: number;
  configId?: string;
  configName?: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

/** Workflow 日志元数据（用于列表展示） */
export interface WorkflowLogMeta {
  workflowId: string;
  owner: string;
  repo: string;
  prNumber: number;
  configId?: string;
  configName?: string;
  status: WorkflowStatus;
  createdAt: string;
  completedAt?: string;
  /** 执行耗时（毫秒） */
  duration?: number;
}

/** Workflow 配置步骤 */
export interface WorkflowConfigStep {
  name: string;
  commands: string[];
  /** 步骤级环境变量 */
  env?: Record<string, string>;
  /** 工作目录（默认 /workspace） */
  workDir?: string;
  /** 步骤超时时间（毫秒） */
  timeout?: number;
  /** 失败后是否继续执行后续步骤 */
  continueOnError?: boolean;
  /** 失败后重试次数 */
  retry?: number;
}

/** Workflow 配置 */
export interface WorkflowConfig {
  id: string;
  name: string;
  steps: WorkflowConfigStep[];
  env?: Record<string, string>;
  timeout?: number;
  /** 全局前置钩子命令（默认：clone 代码） */
  beforeAll?: string;
  /** 全局后置钩子命令 */
  afterAll?: string;
  /** Docker 基础镜像 */
  baseImage?: string;
  /** Docker 镜像源（用于加速） */
  registryMirror?: string;
}

/** 创建 Workflow 配置请求 */
export interface CreateWorkflowConfigRequest {
  name: string;
  steps: WorkflowConfigStep[];
  env?: Record<string, string>;
  timeout?: number;
  beforeAll?: string;
  afterAll?: string;
  baseImage?: string;
  registryMirror?: string;
}

/** 更新 Workflow 配置请求 */
export interface UpdateWorkflowConfigRequest {
  name?: string;
  steps?: WorkflowConfigStep[];
  env?: Record<string, string>;
  timeout?: number;
  beforeAll?: string;
  afterAll?: string;
  baseImage?: string;
  registryMirror?: string;
}

/** 触发 PR Workflow 的请求参数 */
export interface TriggerPRWorkflowRequest {
  owner: string;
  repo: string;
  /** 配置ID（必需） */
  configId: string;
}

/** SSE 事件类型 */
export type SSEEventType = 'connected' | 'step' | 'output' | 'error' | 'complete';

/** SSE 步骤消息 */
export interface SSEStepData {
  name: string;
  status: WorkflowStatus;
}

/** SSE 输出消息 */
export interface SSEOutputData {
  step: string;
  text: string;
}

/** SSE 错误消息 */
export interface SSEErrorData {
  step: string;
  message: string;
}

/** SSE 完成消息 */
export interface SSECompleteData {
  workflowId: string;
  status: WorkflowStatus;
}

/** Docker镜像源测试结果 */
export interface RegistryMirrorTestResult {
  /** 是否成功 */
  success: boolean;
  /** 镜像源地址（空字符串表示Docker Hub） */
  mirror: string;
  /** 镜像源名称（用于显示） */
  mirrorName: string;
  /** 耗时（毫秒） */
  duration: number;
  /** 下载速度（MB/s） */
  speed?: number;
  /** 错误信息 */
  error?: string;
}
