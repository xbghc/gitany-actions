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

// ============================================
// Activity (动态) 相关类型
// ============================================

/** 仓库事件作者信息 */
export interface RepoEventAuthor {
  id: number;
  iam_id: string;
  username: string;
  state: string;
  avatar_url?: string;
  email: string;
  name: string;
  name_cn: string;
  web_url: string;
}

/** 事件评论对象 */
export interface RepoEventNote {
  id: number;
  type?: string;
  body: string;
  author: {
    id: number;
    name: string;
    username: string;
    iam_id: string;
    nick_name: string;
    state: string;
    avatar_url: string;
    email: string;
    name_cn: string;
    web_url: string;
  };
  created_at: string;
  updated_at: string;
  system: boolean;
  noteable_id: number;
  noteable_type: string;
  resolvable: boolean;
  is_reply: boolean;
  noteable_iid: number;
  discussion_id: string;
  project: string;
  diff: string;
  archived: boolean;
  review_categories_cn: string;
  review_categories_en: string;
  severity: string;
  severity_cn: string;
  severity_en: string;
  proposer: {
    id: number;
    name: string;
    username: string;
    iam_id: string;
    nick_name: string;
    state: string;
    avatar_url: string;
    email: string;
    name_cn: string;
    web_url: string;
  };
}

/** 事件项目信息 */
export interface RepoEventProject {
  main_repository_language: string[];
  star_count: number;
  forks_count: number;
  develop_mode: string;
  stared: boolean;
}

/** 事件相关链接 */
export interface RepoEventLinks {
  project: string;
  action_type: string;
}

/** Push 事件数据 */
export interface RepoPushData {
  commit_count: number;
  action: string;
  ref_type: string;
  commit_from?: string;
  commit_to: string;
  ref: string;
  commit_title: string;
}

/** MergeRequest 事件数据 */
export interface RepoMergeRequestInfo {
  source_branch: string;
  source_project: string;
  target_branch: string;
  target_project: string;
  user_notes_count: number;
}

/** 单个仓库事件 */
export interface RepoEvent {
  action: number;
  action_name: string;
  author: RepoEventAuthor;
  author_id: number;
  author_username: string;
  created_at: string;
  project_id: number;
  title?: string;
  filter_sensitive?: boolean;
  // 新增字段（根据实际 API 返回）
  note?: RepoEventNote;
  project?: RepoEventProject;
  project_name?: string;
  target_id?: number;
  target_iid?: number;
  target_title?: string;
  target_type?: string;
  target_type_format?: string;
  push_data?: RepoPushData;
  merge_request_info?: RepoMergeRequestInfo;
  _links?: RepoEventLinks;
}

/** 仓库事件列表响应 */
export interface RepoEventsResponse {
  events: RepoEvent[];
  has_next_page: boolean;
}

/** Activity 筛选参数 */
export interface ActivityFilterParams {
  /** 事件类型 */
  filter?: 'all' | 'push' | 'merged' | 'issue' | 'comments' | 'team' | 'project';
  /** 作者用户名 */
  author?: string;
  /** 起始日期 YYYY-MM-DD */
  before?: string;
  /** 结束日期 YYYY-MM-DD */
  after?: string;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  per_page?: number;
}

/** 统一的活动项类型（用于前端展示） */
export interface ActivityItem extends RepoEvent {
  /** 唯一标识（用于 v-for key） */
  id: string;
  /** 事件类型图标 */
  icon?: string;
  /** 事件类型颜色 */
  color?: string;
}
