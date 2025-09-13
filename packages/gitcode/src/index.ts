export const version = '0.1.0';

export { GitcodeClient } from './client';
export { GitcodeClientAuth } from './client/auth';
export { FileAuthStorage, defaultConfigPath } from './auth';
export type {
  SelfPermissionParams,
  RoleInfo,
  PermissionPoint,
  ResourceNode,
  SelfPermissionResponse,
} from './api/repo/self-permission';
export {
  selfPermissionUrl,
  selfPermissionResponseSchema,
} from './api/repo/self-permission';
export { repoSchema, type Repo } from './api/repo';
export { branchSchema, type Branch } from './api/branch';
export type {
  ListPullsQuery,
  ListPullsParams,
  PullRequest,
  ListPullsResponse,
  CreatePullBody,
} from './api/pr';
export {
  listPullsUrl,
  createPullUrl,
  pullRequestSchema,
  listPullsResponseSchema,
  prCommentSchema,
  prCommentsUrl,
} from './api/pr';
export type { PRComment, PRCommentQueryOptions } from './api/pr';
export type {
  ListIssuesQuery,
  ListIssuesParams,
  Issue,
  ListIssuesResponse,
  IssueCommentsQuery,
  IssueComment,
  IssueCommentsResponse,
  CreateIssueBody,
  CreateIssueParams,
  CreatedIssue,
  CreateIssueCommentBody,
  CreateIssueCommentParams,
  CreatedIssueComment,
} from './api/issue';
export {
  listIssuesUrl,
  issueSchema,
  listIssuesResponseSchema,
  issueCommentsUrl,
  issueCommentSchema,
  issueCommentsResponseSchema,
  createIssueUrl,
  createdIssueSchema,
  createIssueCommentUrl,
  createdIssueCommentSchema,
} from './api/issue';
export {
  userProfileSchema,
  userProfileUrl,
  type UserProfile,
  type UserProfileResponse,
} from './api/user';
export {
  userNamespaceSchema,
  userNamespaceUrl,
  type UserNamespace,
} from './api/user';
export type { RepoRole } from './types/repo-role';
export * from './utils';
export { API_BASE } from './api/constants';

// 新的仓库相关类型导出
export type {
  RepoSettings,
  PullRequestSettings,
  RepoEvent,
  RepoEvents,
  Contributor,
  Contributors,
  FileBlob,
  Compare,
  Webhook,
  Webhooks,
  Branches,
  Commit,
  Commits,
} from './api/repo';
