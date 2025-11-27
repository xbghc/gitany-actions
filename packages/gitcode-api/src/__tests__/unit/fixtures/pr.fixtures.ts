/**
 * Pull Request 相关测试数据 Fixtures
 */

import { validUserSummary } from './user.fixtures.js';

/**
 * 有效的分支引用数据
 */
export const validBranchRef = {
  label: 'owner:feature-branch',
  ref: 'feature-branch',
  sha: 'abc123def456789012345678901234567890abcd',
  repo: null,
  user: null,
};

/**
 * 有效的 base 分支数据
 */
export const validBaseBranch = {
  ...validBranchRef,
  label: 'owner:main',
  ref: 'main',
  sha: 'def456abc789012345678901234567890abcdef',
};

/**
 * 有效的 Pull Request 数据
 */
export const validPullRequest = {
  id: 1001,
  number: 123,
  title: 'Test Pull Request',
  state: 'open',
  head: validBranchRef,
  base: validBaseBranch,
  user: validUserSummary,
  body: 'This is a test pull request description',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  closed_at: null,
  merged_at: null,
  html_url: 'https://gitcode.com/owner/repo/pulls/123',
  diff_url: 'https://gitcode.com/owner/repo/pulls/123.diff',
  patch_url: 'https://gitcode.com/owner/repo/pulls/123.patch',
  issue_url: 'https://gitcode.com/api/v5/repos/owner/repo/issues/123',
  commits_url: 'https://gitcode.com/api/v5/repos/owner/repo/pulls/123/commits',
  review_comments_url: 'https://gitcode.com/api/v5/repos/owner/repo/pulls/123/comments',
  review_comment_url: 'https://gitcode.com/api/v5/repos/owner/repo/pulls/comments/{/number}',
  comments_url: 'https://gitcode.com/api/v5/repos/owner/repo/issues/123/comments',
  statuses_url:
    'https://gitcode.com/api/v5/repos/owner/repo/statuses/abc123def456789012345678901234567890abcd',
  labels: [],
  milestone: null,
  locked: false,
  mergeable: true,
  draft: false,
};

/**
 * 已合并的 Pull Request 数据
 */
export const mergedPullRequest = {
  ...validPullRequest,
  id: 1002,
  number: 124,
  state: 'closed',
  closed_at: '2024-01-03T00:00:00Z',
  merged_at: '2024-01-03T00:00:00Z',
};

/**
 * Pull Request 列表响应
 */
export const pullRequestListResponse = [validPullRequest, mergedPullRequest];

/**
 * 有效的 PR 评论数据
 */
export const validPrComment = {
  id: 5001,
  body: 'This is a test comment',
  user: validUserSummary,
  created_at: '2024-01-02T12:00:00Z',
  updated_at: '2024-01-02T12:00:00Z',
  html_url: 'https://gitcode.com/owner/repo/pulls/123#issuecomment-5001',
};

/**
 * PR 统计数据
 */
export const prCountResponse = {
  open: 5,
  closed: 10,
  merged: 8,
};

/**
 * 无效数据：number 类型错误
 */
export const invalidPullRequest_wrongNumberType = {
  ...validPullRequest,
  number: '123', // 应该是数字
};

/**
 * 无效数据：缺少必需字段
 */
export const invalidPullRequest_missingHead = {
  id: 1001,
  number: 123,
  title: 'Test PR',
  state: 'open',
  // 缺少 head, base, user 字段
};

/**
 * 无效数据：state 值无效
 */
export const invalidPullRequest_invalidState = {
  ...validPullRequest,
  state: 'invalid_state', // 应该是 open, closed 等
};
