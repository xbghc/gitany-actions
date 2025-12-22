/** 用户摘要信息（嵌入在 PR/Issue 中的简化用户对象） */
export interface UserSummary {
  avatar_url?: string;
  html_url: string;
  id: string;
  login: string;
  name: string;
}

/** 用户类型别名 */
export type User = UserSummary;

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

/** 分支信息类型别名 */
export type BranchInfo = Branch;

/** 标签类型 */
export interface Label {
  id: number;
  name: string;
  color: string;
  description?: string;
}

/** 统计数据 */
export interface Statistics {
  open_prs: number;
  closed_prs: number;
  merged_prs: number;
  open_issues: number;
  closed_issues: number;
}
