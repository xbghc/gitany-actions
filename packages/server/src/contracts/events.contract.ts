import { initContract } from '@ts-rest/core';
import { RepoParamsSchema, SuccessResponseSchema, ErrorResponseSchema } from './schemas/common.js';
import { ListEventsQuerySchema, RepoEventsResponseSchema } from './schemas/events.js';

const c = initContract();

export const eventsContract = c.router(
  {
    // GET /api/repo/:owner/:repo/events
    getRepoEvents: {
      method: 'GET',
      path: '/repo/:owner/:repo/events',
      pathParams: RepoParamsSchema,
      query: ListEventsQuerySchema,
      responses: {
        200: SuccessResponseSchema(RepoEventsResponseSchema),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取仓库事件列表',
      description: '获取指定仓库的事件动态，支持按类型、作者、时间过滤和分页',
    },
  },
  {
    pathPrefix: '/api',
  },
);

export type EventsContract = typeof eventsContract;
