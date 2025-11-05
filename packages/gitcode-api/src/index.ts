export const version = '0.1.0';

export { GitCodeClient, GitcodeClient } from './client/index.js';
export { GitcodeClientAuth } from './client/auth/index.js';
export type {
  SelfPermissionParams,
  RoleInfo,
  PermissionPoint,
  ResourceNode,
  SelfPermissionResponse,
} from './api/repo/self-permission.js';
export { selfPermissionUrl, selfPermissionResponseSchema } from './api/repo/self-permission.js';
export { extractRepoRoleFromSelfPermission } from './client/repo/permission.js';
export { repoSchema, type Repo } from './api/repo/index.js';
export { branchSchema, type Branch } from './api/branch/index.js';
export type {
  ListPullsQuery,
  ListPullsParams,
  PullRequest,
  ListPullsResponse,
  CreatePullBody,
  PrCount,
} from './api/pr/index.js';
export {
  listPullsUrl,
  createPullUrl,
  pullRequestSchema,
  listPullsResponseSchema,
  prCommentSchema,
  prCommentsUrl,
} from './api/pr/index.js';
export type { PRComment, PRCommentQueryOptions, CreatedPrComment } from './api/pr/index.js';
export type {
  ListIssuesQuery,
  ListIssuesParams,
  Issue,
  ListIssuesResponse,
  IssueUser,
  IssueCommentsQuery,
  IssueComment,
  IssueCommentsResponse,
  CreateIssueBody,
  CreateIssueParams,
  CreatedIssue,
  CreateIssueCommentBody,
  CreateIssueCommentParams,
  CreatedIssueComment,
  IssueDetail,
  UpdateIssueBody,
  UpdateIssueParams,
  UpdatedIssue,
  UpdatedIssueComment,
} from './api/issue/index.js';
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
  issueDetailSchema,
  getIssueUrl,
  updateIssueUrl,
  updatedIssueSchema,
} from './api/issue/index.js';
export {
  userProfileSchema,
  userProfileUrl,
  type UserProfile,
  type UserProfileResponse,
} from './api/user/index.js';
export { userNamespaceSchema, userNamespaceUrl, type UserNamespace } from './api/user/index.js';
export { userSummarySchema, type UserSummary } from './api/user/index.js';
export type { RepoRole } from './types/repo-role.js';
export * from './utils/index.js';
export { API_BASE } from './api/constants.js';

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
  Notification,
  NotificationActor,
  Notifications,
  NotificationsResponse,
  NotificationQuery,
  MarkNotificationsReadParams,
} from './api/repo/index.js';
export {
  notificationSchema,
  notificationsResponseSchema,
  notificationsUrl,
} from './api/repo/index.js';
