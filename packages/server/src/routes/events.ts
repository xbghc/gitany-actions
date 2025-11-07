import type { RepoEventsQuery } from '@xbghc/gitcode-api';
import { Router } from 'express';
import { withAuth } from '../middleware/auth.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';

export const eventsRouter: Router = Router();

/**
 * 获取仓库事件列表
 * GET /api/repo/:owner/:repo/events
 */
eventsRouter.get(
  '/repo/:owner/:repo/events',
  withAuth(async (req, res, token) => {
    try {
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

      const events = await client.repo.getEvents(owner, repo, query);

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      console.error('Failed to fetch repo events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch repo events',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);
