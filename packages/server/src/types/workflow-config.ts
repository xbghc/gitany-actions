/**
 * Workflow 配置步骤
 */
export interface WorkflowConfigStep {
  /** 步骤名称 */
  name: string;
  /** 命令列表 */
  commands: string[];
}

/**
 * Workflow 配置
 */
export interface WorkflowConfig {
  /** 配置唯一 ID (UUID) */
  id: string;
  /** 配置名称 */
  name: string;
  /** 执行步骤 */
  steps: WorkflowConfigStep[];
  /** 可选环境变量 */
  env?: Record<string, string>;
  /** 可选超时时间（毫秒） */
  timeout?: number;
}

/**
 * 创建配置请求
 */
export interface CreateWorkflowConfigRequest {
  name: string;
  steps: WorkflowConfigStep[];
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * 更新配置请求
 */
export interface UpdateWorkflowConfigRequest {
  name?: string;
  steps?: WorkflowConfigStep[];
  env?: Record<string, string>;
  timeout?: number;
}
