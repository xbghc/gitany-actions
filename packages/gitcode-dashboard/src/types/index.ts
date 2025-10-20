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

/** 统计数据 */
export interface Statistics {
  open_prs: number;
  closed_prs: number;
  merged_prs: number;
  open_issues: number;
  closed_issues: number;
}
