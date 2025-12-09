import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  RepoParamsSchema,
  RepoNumberParamsSchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
} from './schemas/common.js';
import {
  ListPRsQuerySchema,
  PRCountResponseSchema,
  CreatePRCommentBodySchema,
  UpdatePRBodySchema,
} from './schemas/pr.js';

const c = initContract();

export const prContract = c.router(
  {
    // GET /api/repo/:owner/:repo/pulls/count
    getPRCount: {
      method: 'GET',
      path: '/repo/:owner/:repo/pulls/count',
      pathParams: RepoParamsSchema,
      responses: {
        200: SuccessResponseSchema(PRCountResponseSchema),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 PR 数量统计',
      description: '获取指定仓库的 Pull Request 数量统计信息',
    },

    // GET /api/repo/:owner/:repo/pulls
    listPRs: {
      method: 'GET',
      path: '/repo/:owner/:repo/pulls',
      pathParams: RepoParamsSchema,
      query: ListPRsQuerySchema,
      responses: {
        200: SuccessResponseSchema(z.array(z.unknown())),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 PR 列表',
      description: '获取指定仓库的 Pull Request 列表，支持过滤和分页',
    },

    // GET /api/repo/:owner/:repo/pulls/:number
    getPR: {
      method: 'GET',
      path: '/repo/:owner/:repo/pulls/:number',
      pathParams: RepoNumberParamsSchema,
      responses: {
        200: SuccessResponseSchema(z.unknown()),
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
      summary: '获取 PR 详情',
      description: '获取指定 PR 的详细信息（当前未实现）',
    },

    // GET /api/repo/:owner/:repo/pulls/:number/comments
    getPRComments: {
      method: 'GET',
      path: '/repo/:owner/:repo/pulls/:number/comments',
      pathParams: RepoNumberParamsSchema,
      responses: {
        200: SuccessResponseSchema(z.array(z.unknown())),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 PR 评论列表',
      description: '获取指定 PR 的所有评论',
    },

    // POST /api/repo/:owner/:repo/pulls/:number/comments
    createPRComment: {
      method: 'POST',
      path: '/repo/:owner/:repo/pulls/:number/comments',
      pathParams: RepoNumberParamsSchema,
      body: CreatePRCommentBodySchema,
      responses: {
        200: SuccessResponseSchema(z.unknown()),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '添加 PR 评论',
      description: '为指定 PR 添加评论',
    },

    // PATCH /api/repo/:owner/:repo/pulls/:number
    updatePR: {
      method: 'PATCH',
      path: '/repo/:owner/:repo/pulls/:number',
      pathParams: RepoNumberParamsSchema,
      body: UpdatePRBodySchema,
      responses: {
        200: SuccessResponseSchema(z.unknown()),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
      summary: '更新 PR 状态',
      description: '更新 PR 的状态（当前未实现）',
    },

    // PUT /api/repo/:owner/:repo/pulls/:number/merge
    mergePR: {
      method: 'PUT',
      path: '/repo/:owner/:repo/pulls/:number/merge',
      pathParams: RepoNumberParamsSchema,
      body: z.object({}).optional(),
      responses: {
        200: SuccessResponseSchema(z.unknown()),
        401: ErrorResponseSchema,
        501: ErrorResponseSchema,
      },
      summary: '合并 PR',
      description: '合并指定的 Pull Request（当前未实现）',
    },
  },
  {
    pathPrefix: '/api',
  },
);

export type PRContract = typeof prContract;
