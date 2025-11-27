import type { RepoEventsQuery } from '@xbghc/gitcode-api';
import { Router } from 'express';
import { withAuth } from '../middleware/auth.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { ExternalServiceError } from '../errors/index.js';

export const eventsRouter: Router = Router();

/**
 * 获取仓库事件列表
 * GET /api/repo/:owner/:repo/events
 */
eventsRouter.get(
  '/repo/:owner/:repo/events',
  withAuth(async (req, res, token) => {
    const { owner, repo } = req.params;
    const { filter, author, before, after, page, per_page } = req.query;

    const client = createGitCodeClient(token);

    const query: RepoEventsQuery = {};
    if (filter) query.filter = filter as RepoEventsQuery['filter'];
    if (author) query.author = author as string;
    if (before) query.before = before as string;
    if (after) query.after = after as string;
    if (page) query.page = Number(page);
    if (per_page) query.per_page = Number(per_page);

    try {
      const events = await client.repo.getEvents(owner, repo, query);

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      logger.error({ owner, repo, query, error }, 'Failed to fetch repo events');
      throw new ExternalServiceError('GitCode', 'Failed to fetch repo events', error as Error);
    }
  }),
);
