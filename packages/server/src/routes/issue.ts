import { Router, type Request, type Response } from 'express';
import type { ListIssuesQuery } from '@xbghc/gitcode-api';
import { authMiddleware } from '../middleware/auth.js';
import { createGitcodeClient } from '../utils/gitcode-client.js';

export const issueRouter: Router = Router();

// 应用认证中间件到所有路由
issueRouter.use(authMiddleware);

/**
 * 获取 Issue 列表
 * GET /api/repo/:owner/:repo/issues
 */
issueRouter.get('/repo/:owner/:repo/issues', async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const { state, page, per_page, sort, labels } = req.query;

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const query: ListIssuesQuery = {};
    if (state) query.state = state as 'all' | 'open' | 'closed';
    if (page) query.page = Number(page);
    if (per_page) query.per_page = Number(per_page);
    if (sort) query.sort = sort as 'created' | 'updated' | 'comments';
    if (labels) query.labels = labels as string;

    const issues = await client.issue.list(repoUrl, query);

    res.json({
      success: true,
      data: issues,
    });
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 获取 Issue 详情
 * GET /api/repo/:owner/:repo/issues/:number
 */
issueRouter.get('/repo/:owner/:repo/issues/:number', async (req: Request, res: Response) => {
  try {
    const { owner, repo, number } = req.params;

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const issue = await client.issue.get(repoUrl, Number(number));

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    console.error('Failed to fetch issue details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 创建 Issue
 * POST /api/repo/:owner/:repo/issues
 */
issueRouter.post('/repo/:owner/:repo/issues', async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const { title, body, labels, assignees } = req.body;

    if (!title) {
      res.status(400).json({
        success: false,
        error: 'Issue title is required',
      });
      return;
    }

    const client = createGitcodeClient(req.gitcodeToken!);

    const issue = await client.issue.create({
      owner,
      body: {
        repo,
        title,
        body,
        labels,
        assignee: assignees, // Note: API uses 'assignee' (singular) for input
      },
    });

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    console.error('Failed to create issue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create issue',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 更新 Issue
 * PATCH /api/repo/:owner/:repo/issues/:number
 */
issueRouter.patch('/repo/:owner/:repo/issues/:number', async (req: Request, res: Response) => {
  try {
    const { owner, repo, number } = req.params;
    const { title, body, state, labels, assignees } = req.body;

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const issue = await client.issue.update(repoUrl, Number(number), {
      title,
      body,
      state,
      labels,
      assignee: assignees, // Note: API uses 'assignee' (singular) for input
    });

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    console.error('Failed to update issue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update issue',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 获取 Issue 评论列表
 * GET /api/repo/:owner/:repo/issues/:number/comments
 */
issueRouter.get('/repo/:owner/:repo/issues/:number/comments', async (req: Request, res: Response) => {
  try {
    const { owner, repo, number } = req.params;

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    const comments = await client.issue.comments(repoUrl, Number(number));

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error('Failed to fetch issue comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue comments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 添加 Issue 评论
 * POST /api/repo/:owner/:repo/issues/:number/comments
 */
issueRouter.post('/repo/:owner/:repo/issues/:number/comments', async (req: Request, res: Response) => {
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

    const comment = await client.issue.createComment({
      owner,
      repo,
      number: Number(number),
      body: { body },
    });

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error('Failed to create issue comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create issue comment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
