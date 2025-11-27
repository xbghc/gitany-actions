/**
 * Issue 相关测试数据 Fixtures
 */

import { validUserSummary } from './user.fixtures.js';

/**
 * 有效的 Issue 数据
 */
export const validIssue = {
  id: 2001,
  number: 456,
  title: 'Test Issue',
  state: 'open',
  user: validUserSummary,
  body: 'This is a test issue description',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  closed_at: null,
  html_url: 'https://gitcode.com/owner/repo/issues/456',
  comments_url: 'https://gitcode.com/api/v5/repos/owner/repo/issues/456/comments',
  labels_url: 'https://gitcode.com/api/v5/repos/owner/repo/issues/456/labels{/name}',
  events_url: 'https://gitcode.com/api/v5/repos/owner/repo/issues/456/events',
  labels: [],
  milestone: null,
  locked: false,
  comments: 3,
};

/**
 * 已关闭的 Issue 数据
 */
export const closedIssue = {
  ...validIssue,
  id: 2002,
  number: 457,
  state: 'closed',
  closed_at: '2024-01-05T00:00:00Z',
};

/**
 * Issue 列表响应
 */
export const issueListResponse = [validIssue, closedIssue];

/**
 * 有效的 Issue 评论数据
 */
export const validIssueComment = {
  id: 6001,
  body: 'This is a test issue comment',
  user: validUserSummary,
  created_at: '2024-01-03T10:00:00Z',
  updated_at: '2024-01-03T10:00:00Z',
  html_url: 'https://gitcode.com/owner/repo/issues/456#issuecomment-6001',
};

/**
 * 无效数据：number 类型错误
 */
export const invalidIssue_wrongNumberType = {
  ...validIssue,
  number: '456', // 应该是数字
};

/**
 * 无效数据：缺少 user 字段
 */
export const invalidIssue_missingUser = {
  id: 2001,
  number: 456,
  title: 'Test Issue',
  state: 'open',
  // 缺少 user 字段
};
