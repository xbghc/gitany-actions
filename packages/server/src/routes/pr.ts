import { Router, type Request, type Response } from 'express';
import type { ListPullsQuery } from '@xbghc/gitcode-api';
import { authMiddleware } from '../middleware/auth.js';
import { createGitcodeClient } from '../utils/gitcode-client.js';

export const prRouter: Router = Router();

// 应用认证中间件到所有路由
prRouter.use(authMiddleware);

/**
 * 获取 PR 数量统计
 * GET /api/repo/:owner/:repo/pulls/count
 * 注意：此路由必须在 /repo/:owner/:repo/pulls/:number 之前定义
 */
prRouter.get('/repo/:owner/:repo/pulls/count', async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const count = await client.pr.count(repoUrl);

    res.json({
      success: true,
      data: count,
    });
  } catch (error) {
    console.error('Failed to fetch PR count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PR count',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 获取 PR 列表
 * GET /api/repo/:owner/:repo/pulls
 */
prRouter.get('/repo/:owner/:repo/pulls', async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const { state, page, per_page, sort, direction, head, base } = req.query;

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const query: ListPullsQuery = {};
    if (state) query.state = state as string;
    if (page) query.page = Number(page);
    if (per_page) query.per_page = Number(per_page);
    if (sort) query.sort = sort as string;
    if (direction) query.direction = direction as 'asc' | 'desc';
    if (head) query.head = head as string;
    if (base) query.base = base as string;

    const pulls = await client.pr.list(repoUrl, query);

    res.json({
      success: true,
      data: pulls,
    });
  } catch (error) {
    console.error('Failed to fetch pull requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pull requests',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 获取 PR 详情
 * GET /api/repo/:owner/:repo/pulls/:number
 * TODO: 待实现 client.pr.get() 方法
 */
prRouter.get('/repo/:owner/:repo/pulls/:number', async (req: Request, res: Response) => {
  try {
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      message: 'PR details endpoint is not implemented yet',
    });
  } catch (error) {
    console.error('Failed to fetch PR details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PR details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 获取 PR 评论列表
 * GET /api/repo/:owner/:repo/pulls/:number/comments
 */
prRouter.get('/repo/:owner/:repo/pulls/:number/comments', async (req: Request, res: Response) => {
  try {
    const { owner, repo, number } = req.params;

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const comments = await client.pr.comments(repoUrl, Number(number));

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error('Failed to fetch PR comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PR comments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 添加 PR 评论
 * POST /api/repo/:owner/:repo/pulls/:number/comments
 */
prRouter.post('/repo/:owner/:repo/pulls/:number/comments', async (req: Request, res: Response) => {
  try {
    const { owner, repo, number } = req.params;
    const { body } = req.body;

    if (!body) {
      res.status(400).json({
        success: false,
        error: 'Comment body is required',
      });
      return;
    }

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const comment = await client.pr.createComment(repoUrl, Number(number), body);

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error('Failed to create PR comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create PR comment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 更新 PR 状态
 * PATCH /api/repo/:owner/:repo/pulls/:number
 * TODO: 待实现 client.pr.update() 方法
 */
prRouter.patch('/repo/:owner/:repo/pulls/:number', async (req: Request, res: Response) => {
  try {
    const { state } = req.body;

    if (!state || !['open', 'closed'].includes(state)) {
      res.status(400).json({
        success: false,
        error: 'Valid state (open or closed) is required',
      });
      return;
    }

    res.status(501).json({
      success: false,
      error: 'Not implemented',
      message: 'Update PR endpoint is not implemented yet',
    });
  } catch (error) {
    console.error('Failed to update PR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update PR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 合并 PR
 * PUT /api/repo/:owner/:repo/pulls/:number/merge
 * TODO: 待实现 client.pr.merge() 方法
 */
prRouter.put('/repo/:owner/:repo/pulls/:number/merge', async (req: Request, res: Response) => {
  try {
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      message: 'Merge PR endpoint is not implemented yet',
    });
  } catch (error) {
    console.error('Failed to merge PR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to merge PR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
