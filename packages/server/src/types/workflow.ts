/**
 * Workflow执行状态
 */
export type WorkflowStatus = 'pending' | 'running' | 'success' | 'failed';

/**
 * Workflow步骤
 */
export interface WorkflowStep {
  /** 步骤名称 */
  name: string;
  /** 步骤状态 */
  status: WorkflowStatus;
  /** 步骤输出（日志） */
  output?: string;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
}

/**
 * Workflow执行结果
 */
export interface WorkflowResult {
  /** Workflow唯一标识 */
  workflowId: string;
  /** 仓库所有者 */
  owner: string;
  /** 仓库名称 */
  repo: string;
  /** 仓库 URL */
  repoUrl: string;
  /** PR 编号 */
  prNumber: number;
  /** 配置 ID（如果使用了预定义配置） */
  configId?: string;
  /** 配置名称（用于展示） */
  configName?: string;
  /** 整体状态 */
  status: WorkflowStatus;
  /** 执行步骤列表 */
  steps: WorkflowStep[];
  /** 创建时间 */
  createdAt: string;
  /** 完成时间 */
  completedAt?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * SSE消息类型
 */
export type SSEMessageType = 'step' | 'output' | 'error' | 'complete';

/**
 * SSE消息
 */
export interface SSEMessage {
  /** 消息类型 */
  type: SSEMessageType;
  /** 消息数据 */
  data: unknown;
}

/**
 * 步骤变更消息
 */
export interface SSEStepMessage {
  type: 'step';
  data: {
    name: string;
    status: WorkflowStatus;
  };
}

/**
 * 输出消息
 */
export interface SSEOutputMessage {
  type: 'output';
  data: {
    step: string;
    text: string;
  };
}

/**
 * 错误消息
 */
export interface SSEErrorMessage {
  type: 'error';
  data: {
    step: string;
    message: string;
  };
}

/**
 * 完成消息
 */
export interface SSECompleteMessage {
  type: 'complete';
  data: {
    workflowId: string;
    status: WorkflowStatus;
  };
}

/**
 * Docker镜像源测试结果
 */
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

/**
 * Workflow日志元数据（用于列表展示）
 */
export interface WorkflowLogMeta {
  /** Workflow唯一标识 */
  workflowId: string;
  /** 仓库所有者 */
  owner: string;
  /** 仓库名称 */
  repo: string;
  /** PR 编号 */
  prNumber: number;
  /** 配置 ID */
  configId?: string;
  /** 配置名称 */
  configName?: string;
  /** 整体状态 */
  status: WorkflowStatus;
  /** 创建时间 */
  createdAt: string;
  /** 完成时间 */
  completedAt?: string;
  /** 执行耗时（毫秒） */
  duration?: number;
}
