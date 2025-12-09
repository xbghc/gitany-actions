import type { ServerInferResponses } from '@ts-rest/core';
import type { EventsContract } from '../contracts/events.contract.js';
import type { ListEventsQuery } from '../contracts/schemas/events.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { getTokenFromRequest } from '../utils/auth.js';
import type { Request } from 'express';

type EventsResponses = ServerInferResponses<EventsContract>;

export const eventsHandler = {
  getRepoEvents: async ({
    params,
    query,
    req,
  }: {
    params: { owner: string; repo: string };
    query: ListEventsQuery;
    req: Request;
  }): Promise<EventsResponses['getRepoEvents']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);

    try {
      const events = await client.repo.getEvents(params.owner, params.repo, query);

      return {
        status: 200,
        body: { success: true, data: events },
      };
    } catch (error) {
      logger.error({ params, query, error }, 'Failed to fetch repo events');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to fetch repo events',
        },
      };
    }
  },
};
