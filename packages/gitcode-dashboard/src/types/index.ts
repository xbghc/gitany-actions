// ============================================
// 基础类型定义（参考自 gitcode-api）
// ============================================

/** 用户摘要信息（嵌入在 PR/Issue 中的简化用户对象） */
export interface UserSummary {
  avatar_url?: string;
  html_url: string;
  id: string;
  login: string;
  name: string;
}

/** 完整的用户资料信息 */
export interface UserProfile {
  avatar_url: string;
  followers_url: string;
  html_url: string;
  id: string;
  login: string;
  name: string;
  type: string;
  url: string;
  bio?: string;
  blog?: string;
  company?: string;
  email?: string;
  followers: number;
  following: number;
  top_languages: string[];
}

/** 仓库信息 */
export interface Repo {
  id: number;
  full_name: string;
  human_name: string;
  path: string;
  name: string;
  description?: string;
  owner?: UserSummary;
  html_url: string;
}

/** 分支信息 */
export interface Branch {
  label: string;
  ref: string;
  sha: string;
  repo?: Repo | null;
  user?: UserSummary | null;
}

/** Pull Request 查询参数 */
export interface ListPullsQuery {
  state?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: string;
  head?: string;
  base?: string;
}

/** Pull Request 对象 */
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  head: Branch;
  base: Branch;
  user: UserSummary;
  body?: string;
  created_at?: string;
  updated_at?: string;
  merged_at?: string | null;
}

/** PR 评论对象 */
export interface PRComment {
  id: number;
  body: string;
  user: UserSummary;
  created_at: string;
  updated_at: string;
}

/** PR 统计计数 */
export interface PrCount {
  all: number;
  opened: number;
  closed: number;
  merged: number;
  locked: number;
}

/** Issue 查询参数 */
export interface ListIssuesQuery {
  state?: 'open' | 'closed' | 'all';
  labels?: string;
  page?: number;
  per_page?: number;
  sort?: 'created' | 'updated' | 'comments';
}

/** Issue 标签 */
export interface IssueLabel {
  id?: number | string;
  name?: string;
  title?: string;
  color?: string;
  description?: string;
}

/** Issue 对象 */
export interface Issue {
  id: number;
  html_url: string;
  number: string;
  state: string;
  title: string;
  body?: string | null;
  user?: UserSummary;
  assignees: UserSummary[];
  labels: IssueLabel[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

/** Issue 评论对象 */
export interface IssueComment {
  id: number;
  comment_id?: number;
  body: string;
  user: UserSummary;
  created_at: string;
  updated_at: string;
}

/** 创建 Issue 请求体 */
export interface CreateIssueBody {
  repo?: string;
  title: string;
  body: string;
  assignee?: string;
  milestone?: number;
  labels?: string;
  security_hole?: string;
  template_path?: string;
}

/** 更新 Issue 请求体 */
export interface UpdateIssueBody {
  title?: string;
  body?: string;
  assignee?: string;
  milestone?: number;
  labels?: Array<string | number>;
  state?: 'open' | 'closed';
}

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
