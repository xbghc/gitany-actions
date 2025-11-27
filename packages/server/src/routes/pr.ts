import type { ListPullsQuery } from '@xbghc/gitcode-api';
import { Router, type Request, type Response } from 'express';
import { withAuth } from '../middleware/auth.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ExternalServiceError } from '../errors/index.js';

export const prRouter: Router = Router();

/**
 * 获取 PR 数量统计
 * GET /api/repo/:owner/:repo/pulls/count
 * 注意：此路由必须在 /repo/:owner/:repo/pulls/:number 之前定义
 */
prRouter.get(
  '/repo/:owner/:repo/pulls/count',
  withAuth(async (req, res, token) => {
    const { owner, repo } = req.params;

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    try {
      const count = await client.pr.count(repoUrl);

      res.json({
        success: true,
        data: count,
      });
    } catch (error) {
      logger.error({ owner, repo, error }, 'Failed to fetch PR count');
      throw new ExternalServiceError('GitCode', 'Failed to fetch PR count', error as Error);
    }
  }),
);

/**
 * 获取 PR 列表
 * GET /api/repo/:owner/:repo/pulls
 */
prRouter.get(
  '/repo/:owner/:repo/pulls',
  withAuth(async (req, res, token) => {
    const { owner, repo } = req.params;
    const { state, page, per_page, sort, direction, head, base } = req.query;

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const query: ListPullsQuery = {};
    if (state) query.state = state as string;
    if (page) query.page = Number(page);
    if (per_page) query.per_page = Number(per_page);
    if (sort) query.sort = sort as string;
    if (direction) query.direction = direction as 'asc' | 'desc';
    if (head) query.head = head as string;
    if (base) query.base = base as string;

    try {
      const pulls = await client.pr.list(repoUrl, query);

      res.json({
        success: true,
        data: pulls,
      });
    } catch (error) {
      logger.error({ owner, repo, query, error }, 'Failed to fetch pull requests');
      throw new ExternalServiceError('GitCode', 'Failed to fetch pull requests', error as Error);
    }
  }),
);

/**
 * 获取 PR 详情
 * GET /api/repo/:owner/:repo/pulls/:number
 * TODO: 待实现 client.pr.get() 方法
 */
prRouter.get('/repo/:owner/:repo/pulls/:number', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented',
    message: 'PR details endpoint is not implemented yet',
  });
});

/**
 * 获取 PR 评论列表
 * GET /api/repo/:owner/:repo/pulls/:number/comments
 */
prRouter.get(
  '/repo/:owner/:repo/pulls/:number/comments',
  withAuth(async (req, res, token) => {
    const { owner, repo, number } = req.params;

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    try {
      const comments = await client.pr.comments(repoUrl, Number(number));

      res.json({
        success: true,
        data: comments,
      });
    } catch (error) {
      logger.error({ owner, repo, prNumber: number, error }, 'Failed to fetch PR comments');
      throw new ExternalServiceError('GitCode', 'Failed to fetch PR comments', error as Error);
    }
  }),
);

/**
 * 添加 PR 评论
 * POST /api/repo/:owner/:repo/pulls/:number/comments
 */
prRouter.post(
  '/repo/:owner/:repo/pulls/:number/comments',
  withAuth(async (req, res, token) => {
    const { owner, repo, number } = req.params;
    const { body } = req.body;

    if (!body) {
      throw new ValidationError('Comment body is required');
    }

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    try {
      const comment = await client.pr.createComment(repoUrl, Number(number), body);

      logger.info({ owner, repo, prNumber: number }, 'PR comment created');

      res.json({
        success: true,
        data: comment,
      });
    } catch (error) {
      logger.error({ owner, repo, prNumber: number, error }, 'Failed to create PR comment');
      throw new ExternalServiceError('GitCode', 'Failed to create PR comment', error as Error);
    }
  }),
);

/**
 * 更新 PR 状态
 * PATCH /api/repo/:owner/:repo/pulls/:number
 * TODO: 待实现 client.pr.update() 方法
 */
prRouter.patch('/repo/:owner/:repo/pulls/:number', async (req: Request, res: Response) => {
  const { state } = req.body;

  if (!state || !['open', 'closed'].includes(state)) {
    throw new ValidationError('Valid state (open or closed) is required');
  }

  res.status(501).json({
    success: false,
    error: 'Not implemented',
    message: 'Update PR endpoint is not implemented yet',
  });
});

/**
 * 合并 PR
 * PUT /api/repo/:owner/:repo/pulls/:number/merge
 * TODO: 待实现 client.pr.merge() 方法
 */
prRouter.put('/repo/:owner/:repo/pulls/:number/merge', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented',
    message: 'Merge PR endpoint is not implemented yet',
  });
});
