/**
 * Workflow 配置步骤
 */
export interface WorkflowConfigStep {
  /** 步骤名称 */
  name: string;
  /** 命令列表 */
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
  /** 全局前置钩子命令（默认：clone 代码） */
  beforeAll?: string;
  /** 全局后置钩子命令 */
  afterAll?: string;
  /** Docker 基础镜像 */
  baseImage?: string;
  /** Docker 镜像源（用于加速） */
  registryMirror?: string;
}

/**
 * 创建配置请求
 */
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

/**
 * 更新配置请求
 */
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
