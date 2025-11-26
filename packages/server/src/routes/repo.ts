import type { ListIssuesQuery, ListPullsQuery } from '@xbghc/gitcode-api';
import { Router } from 'express';
import { withAuth } from '../middleware/auth.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ExternalServiceError } from '../errors/index.js';

export const repoRouter: Router = Router();

/**
 * 获取仓库的 PR 列表
 * POST /api/pulls
 */
repoRouter.post(
  '/pulls',
  withAuth(async (req, res, token) => {
    const { owner, repo, state, page, per_page, sort, direction, head, base } = req.body;

    // 验证必需参数
    if (!owner || !repo) {
      throw new ValidationError('owner and repo are required');
    }

    // 使用用户提供的 token 创建客户端
    const client = createGitCodeClient(token);

    // 构造仓库 URL
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    // 构造查询参数
    const query: ListPullsQuery = {};
    if (state) query.state = state;
    if (page) query.page = page;
    if (per_page) query.per_page = per_page;
    if (sort) query.sort = sort;
    if (direction) query.direction = direction;
    if (head) query.head = head;
    if (base) query.base = base;

    try {
      // 调用 GitCode API
      const pulls = await client.pr.list(repoUrl, query);

      res.json({
        owner,
        repo,
        total: pulls.length,
        data: pulls,
      });
    } catch (error) {
      logger.error({ owner, repo, query, error }, 'Failed to fetch pull requests');
      throw new ExternalServiceError('GitCode', 'Failed to fetch pull requests', error as Error);
    }
  }),
);

/**
 * 获取仓库的 Issue 列表
 * POST /api/issues
 */
repoRouter.post(
  '/issues',
  withAuth(async (req, res, token) => {
    const { owner, repo, state, page, per_page, sort, labels } = req.body;

    // 验证必需参数
    if (!owner || !repo) {
      throw new ValidationError('owner and repo are required');
    }

    // 使用用户提供的 token 创建客户端
    const client = createGitCodeClient(token);

    // 构造仓库 URL
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    // 构造查询参数
    const query: ListIssuesQuery = {};
    if (state) query.state = state;
    if (page) query.page = page;
    if (per_page) query.per_page = per_page;
    if (sort) query.sort = sort;
    if (labels) query.labels = labels;

    try {
      // 调用 GitCode API
      const issues = await client.issue.list(repoUrl, query);

      res.json({
        owner,
        repo,
        total: issues.length,
        data: issues,
      });
    } catch (error) {
      logger.error({ owner, repo, query, error }, 'Failed to fetch issues');
      throw new ExternalServiceError('GitCode', 'Failed to fetch issues', error as Error);
    }
  }),
);
