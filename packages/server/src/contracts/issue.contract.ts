import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  RepoParamsSchema,
  RepoNumberParamsSchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
} from './schemas/common.js';
import {
  ListIssuesQuerySchema,
  IssueCountResponseSchema,
  CreateIssueBodySchema,
  UpdateIssueBodySchema,
  CreateIssueCommentBodySchema,
} from './schemas/issue.js';

const c = initContract();

export const issueContract = c.router(
  {
    // GET /api/repo/:owner/:repo/issues
    listIssues: {
      method: 'GET',
      path: '/repo/:owner/:repo/issues',
      pathParams: RepoParamsSchema,
      query: ListIssuesQuerySchema,
      responses: {
        200: SuccessResponseSchema(z.array(z.unknown())),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 Issue 列表',
      description: '获取指定仓库的 Issue 列表，支持过滤和分页',
    },

    // GET /api/repo/:owner/:repo/issues/count
    getIssueCount: {
      method: 'GET',
      path: '/repo/:owner/:repo/issues/count',
      pathParams: RepoParamsSchema,
      responses: {
        200: SuccessResponseSchema(IssueCountResponseSchema).extend({
          note: z.string().optional(),
        }),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 Issue 数量统计',
      description: '通过探测获取指定仓库的 Issue 数量统计',
    },

    // GET /api/repo/:owner/:repo/issues/:number
    getIssue: {
      method: 'GET',
      path: '/repo/:owner/:repo/issues/:number',
      pathParams: RepoNumberParamsSchema,
      responses: {
        200: SuccessResponseSchema(z.unknown()),
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 Issue 详情',
      description: '获取指定 Issue 的详细信息',
    },

    // POST /api/repo/:owner/:repo/issues
    createIssue: {
      method: 'POST',
      path: '/repo/:owner/:repo/issues',
      pathParams: RepoParamsSchema,
      body: CreateIssueBodySchema,
      responses: {
        200: SuccessResponseSchema(z.unknown()),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '创建 Issue',
      description: '在指定仓库创建新的 Issue',
    },

    // PATCH /api/repo/:owner/:repo/issues/:number
    updateIssue: {
      method: 'PATCH',
      path: '/repo/:owner/:repo/issues/:number',
      pathParams: RepoNumberParamsSchema,
      body: UpdateIssueBodySchema,
      responses: {
        200: SuccessResponseSchema(z.unknown()),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '更新 Issue',
      description: '更新 Issue 的信息（标题、描述、状态等）',
    },

    // GET /api/repo/:owner/:repo/issues/:number/comments
    getIssueComments: {
      method: 'GET',
      path: '/repo/:owner/:repo/issues/:number/comments',
      pathParams: RepoNumberParamsSchema,
      responses: {
        200: SuccessResponseSchema(z.array(z.unknown())),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 Issue 评论列表',
      description: '获取指定 Issue 的所有评论',
    },

    // POST /api/repo/:owner/:repo/issues/:number/comments
    createIssueComment: {
      method: 'POST',
      path: '/repo/:owner/:repo/issues/:number/comments',
      pathParams: RepoNumberParamsSchema,
      body: CreateIssueCommentBodySchema,
      responses: {
        200: SuccessResponseSchema(z.unknown()),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '添加 Issue 评论',
      description: '为指定 Issue 添加评论',
    },
  },
  {
    pathPrefix: '/api',
  },
);

export type IssueContract = typeof issueContract;
