import type { ServerInferResponses } from '@ts-rest/core';
import type { PRContract } from '../contracts/pr.contract.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { getTokenFromRequest } from '../utils/auth.js';
import type { Request } from 'express';

type PRResponses = ServerInferResponses<PRContract>;

export const prHandler = {
  getPRCount: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string };
    req: Request;
  }): Promise<PRResponses['getPRCount']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${params.owner}/${params.repo}`;

    try {
      const count = await client.pr.count(repoUrl);
      return {
        status: 200,
        body: { success: true, data: count },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to fetch PR count');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to fetch PR count',
        },
      };
    }
  },

  listPRs: async ({
    params,
    query,
    req,
  }: {
    params: { owner: string; repo: string };
    query: Record<string, unknown>;
    req: Request;
  }): Promise<PRResponses['listPRs']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${params.owner}/${params.repo}`;

    try {
      const pulls = await client.pr.list(repoUrl, query);
      return {
        status: 200,
        body: { success: true, data: pulls },
      };
    } catch (error) {
      logger.error({ params, query, error }, 'Failed to fetch PRs');
      return {
        status: 500,
        body: { success: false, error: 'EXTERNAL_SERVICE_ERROR', message: 'Failed to fetch PRs' },
      };
    }
  },

  getPR: async (): Promise<PRResponses['getPR']> => {
    return {
      status: 501,
      body: {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'PR details endpoint is not implemented yet',
      },
    };
  },

  getPRComments: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string; number: number };
    req: Request;
  }): Promise<PRResponses['getPRComments']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${params.owner}/${params.repo}`;

    try {
      const comments = await client.pr.comments(repoUrl, params.number);
      return {
        status: 200,
        body: { success: true, data: comments },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to fetch PR comments');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to fetch PR comments',
        },
      };
    }
  },

  createPRComment: async ({
    params,
    body,
    req,
  }: {
    params: { owner: string; repo: string; number: number };
    body: { body: string };
    req: Request;
  }): Promise<PRResponses['createPRComment']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${params.owner}/${params.repo}`;

    try {
      const comment = await client.pr.createComment(repoUrl, params.number, body.body);
      logger.info({ params }, 'PR comment created');
      return {
        status: 200,
        body: { success: true, data: comment },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to create PR comment');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to create PR comment',
        },
      };
    }
  },

  updatePR: async (): Promise<PRResponses['updatePR']> => {
    return {
      status: 501,
      body: {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Update PR endpoint is not implemented yet',
      },
    };
  },

  mergePR: async (): Promise<PRResponses['mergePR']> => {
    return {
      status: 501,
      body: {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Merge PR endpoint is not implemented yet',
      },
    };
  },
};
