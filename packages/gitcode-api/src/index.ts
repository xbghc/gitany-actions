export const version = '0.1.0';

export { branchSchema, type Branch } from './api/branch/index.js';
export { API_BASE } from './api/constants.js';
export { isHttpError, type HttpError, type HttpErrorResponse } from './client/http-error.js';
export {
  createdIssueCommentSchema,
  createdIssueSchema,
  createIssueCommentUrl,
  createIssueUrl,
  getIssueUrl,
  issueCommentSchema,
  issueCommentsResponseSchema,
  issueCommentsUrl,
  issueDetailSchema,
  issueSchema,
  listIssuesResponseSchema,
  listIssuesUrl,
  updatedIssueSchema,
  updateIssueUrl,
} from './api/issue/index.js';
export type {
  CreatedIssue,
  CreatedIssueComment,
  CreateIssueBody,
  CreateIssueCommentBody,
  CreateIssueCommentParams,
  CreateIssueParams,
  Issue,
  IssueComment,
  IssueCommentsQuery,
  IssueCommentsResponse,
  IssueDetail,
  IssueUser,
  ListIssuesParams,
  ListIssuesQuery,
  ListIssuesResponse,
  UpdatedIssue,
  UpdatedIssueComment,
  UpdateIssueBody,
  UpdateIssueParams,
} from './api/issue/index.js';
export {
  createPullUrl,
  listPullsResponseSchema,
  listPullsUrl,
  prCommentSchema,
  prCommentsUrl,
  pullRequestSchema,
} from './api/pr/index.js';
export type {
  CreatedPrComment,
  CreatePullBody,
  ListPullsParams,
  ListPullsQuery,
  ListPullsResponse,
  PRComment,
  PRCommentQueryOptions,
  PrCount,
  PullRequest,
} from './api/pr/index.js';
export { repoSchema, type Repo } from './api/repo/index.js';
export { selfPermissionResponseSchema, selfPermissionUrl } from './api/repo/self-permission.js';
export type {
  PermissionPoint,
  ResourceNode,
  RoleInfo,
  SelfPermissionParams,
  SelfPermissionResponse,
} from './api/repo/self-permission.js';
export {
  userProfileSchema,
  userProfileUrl,
  userSummarySchema,
  type UserProfile,
  type UserProfileResponse,
  type UserSummary,
} from './api/user/index.js';
export { GitCodeClientAuth } from './client/auth/index.js';
export { GitCodeClient } from './client/index.js';
export { extractRepoRoleFromSelfPermission } from './client/repo/permission.js';
export type { RepoRole } from './types/repo-role.js';
export * from './utils/index.js';

// 新的仓库相关类型导出
export {
  notificationSchema,
  notificationsResponseSchema,
  notificationsUrl,
} from './api/repo/index.js';
export type {
  Branches,
  Commit,
  Commits,
  Compare,
  Contributor,
  Contributors,
  FileBlob,
  MarkNotificationsReadParams,
  Notification,
  NotificationActor,
  NotificationQuery,
  Notifications,
  NotificationsResponse,
  PullRequestSettings,
  RepoEvent,
  RepoEvents,
  RepoSettings,
  Webhook,
  Webhooks,
} from './api/repo/index.js';

// 错误处理
export { ApiValidationError, type ApiValidationContext } from './client/errors.js';
import { ApiValidationError } from './client/errors.js';

/**
 * 类型守卫：检查错误是否为 ApiValidationError
 *
 * @param error - 要检查的错误对象
 * @returns 如果是 ApiValidationError 返回 true
 *
 * @example
 * ```typescript
 * try {
 *   const data = await client.pr.list(url);
 * } catch (error) {
 *   if (isApiValidationError(error)) {
 *     console.log('字段错误:', error.getFieldErrors());
 *   }
 * }
 * ```
 */
export function isApiValidationError(error: unknown): error is ApiValidationError {
  return error instanceof ApiValidationError;
}
