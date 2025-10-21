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
 * 探测 Issue 数量
 * GET /api/repo/:owner/:repo/issues/count
 *
 * 注意：由于 GitCode Issue API 不支持 only_count 参数，
 * 此端点通过多次请求来探测Issue数量
 */
issueRouter.get('/repo/:owner/:repo/issues/count', async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;

    const client = createGitcodeClient(req.gitcodeToken!);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    // 探测各个状态的Issue数量
    const countResult = {
      all: 0,
      opened: 0,
      closed: 0,
    };

    // 三阶段探测：指数搜索 → 二分查找 → 直接获取最后一页
    const probeCount = async (state: 'all' | 'open' | 'closed'): Promise<number> => {
      // 第一阶段：指数级探测，快速确定范围（100, 1000, 10000）
      // 从 100 开始，因为 per_page 最大支持 100
      let lower = 0;
      let upper = 100;

      while (upper <= 10000) {
        try {
          const issues = await client.issue.list(repoUrl, {
            state,
            page: upper,
            per_page: 1,
          });

          if (issues.length === 0) {
            // 该页无数据，范围确定在 [lower, upper) 之间
            break;
          } else {
            // 该页有数据，继续探测更大范围
            lower = upper;
            upper *= 10; // 100 → 1000 → 10000
          }
        } catch {
          break;
        }
      }

      // 限制上限
      if (upper > 10000) {
        upper = 10000;
      }

      // 第二阶段：如果区间小于100，直接获取最后一页确定准确数量
      if (upper - lower < 100) {
        // 计算这个区间所在的页码（假设 per_page=100）
        const pageNum = Math.floor(lower / 100) + 1;
        const baseCount = (pageNum - 1) * 100;

        try {
          const issues = await client.issue.list(repoUrl, {
            state,
            page: pageNum,
            per_page: 100,
          });

          // 返回基数 + 这一页的数量
          return baseCount + issues.length;
        } catch {
          // 如果请求失败，回退到二分查找
        }
      }

      // 第三阶段：区间较大时使用二分查找
      let left = lower;
      let right = upper;
      let count = lower;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        try {
          const issues = await client.issue.list(repoUrl, {
            state,
            page: mid,
            per_page: 1,
          });

          if (issues.length > 0) {
            count = mid;
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        } catch {
          break;
        }
      }

      return count;
    };

    // 并行探测所有状态
    const [allCount, openCount, closedCount] = await Promise.all([
      probeCount('all'),
      probeCount('open'),
      probeCount('closed'),
    ]);

    countResult.all = allCount;
    countResult.opened = openCount;
    countResult.closed = closedCount;

    res.json({
      success: true,
      data: countResult,
      note: 'Accurate count via exponential + binary search (通过指数探测和二分查找获取的准确数量，最多支持10000个)',
    });
  } catch (error) {
    console.error('Failed to probe issue count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to probe issue count',
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
