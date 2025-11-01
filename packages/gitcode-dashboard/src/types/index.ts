// 从 gitcode-api 导入基础类型
import type {
  PullRequest,
  PRComment,
  Issue,
  IssueComment,
  UserSummary,
  ListPullsQuery,
  ListIssuesQuery,
  CreateIssueBody,
  UpdateIssueBody,
  Branch,
  PrCount,
} from '@xbghc/gitcode-api';

// ============================================
// 类型别名 - 保持 dashboard 代码兼容性
// ============================================

/** 用户类型别名 */
export type User = UserSummary;

/** 分支信息类型别名 */
export type BranchInfo = Branch;

/** 创建 Issue 参数类型别名 */
export type CreateIssueParams = CreateIssueBody;

/** 更新 Issue 参数类型别名 */
export type UpdateIssueParams = UpdateIssueBody;

// ============================================
// 重新导出 gitcode-api 类型
// ============================================

export type { PullRequest, PRComment, Issue, IssueComment, PrCount };

// ============================================
// Dashboard 特有类型
// ============================================

/** API 响应通用类型 (Server 端包装) */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 标签类型 */
export interface Label {
  id: number;
  name: string;
  color: string;
  description?: string;
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

/** PR 筛选参数 (扩展自 gitcode-api) */
export interface PRFilterParams extends ListPullsQuery {
  // 继承 gitcode-api 的 ListPullsQuery
  // 可以在这里添加 dashboard 特有的筛选字段
  author?: string;
}

/** Issue 筛选参数 (扩展自 gitcode-api) */
export interface IssueFilterParams extends ListIssuesQuery {
  // 继承 gitcode-api 的 ListIssuesQuery
  // 可以在这里添加 dashboard 特有的筛选字段
  author?: string;
  direction?: 'asc' | 'desc';
}

/** Issue 数量统计 */
export interface IssueCount {
  all: number;
  opened: number;
  closed: number;
}

/** 统计数据 */
export interface Statistics {
  open_prs: number;
  closed_prs: number;
  merged_prs: number;
  open_issues: number;
  closed_issues: number;
}

// ============================================
// Workflow 相关类型
// ============================================

/** Workflow 执行状态 */
export type WorkflowStatus = 'pending' | 'running' | 'success' | 'failed';

/** Workflow 步骤 */
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
  status: WorkflowStatus;
  steps: WorkflowStep[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

/** Workflow 配置 */
export interface WorkflowConfig {
  owner: string;
  repo: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  buildCommand?: string;
  lintCommand?: string;
  baseImage?: string;
  registryMirror?: string;  // Docker 镜像源
  timeout?: number;
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
