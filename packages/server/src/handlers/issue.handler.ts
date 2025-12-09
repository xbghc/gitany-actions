import type { ServerInferResponses } from '@ts-rest/core';
import type { IssueContract } from '../contracts/issue.contract.js';
import type { UpdateIssueBody } from '../contracts/schemas/issue.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { getTokenFromRequest } from '../utils/auth.js';
import type { Request } from 'express';

type IssueResponses = ServerInferResponses<IssueContract>;

export const issueHandler = {
  listIssues: async ({
    params,
    query,
    req,
  }: {
    params: { owner: string; repo: string };
    query: Record<string, unknown>;
    req: Request;
  }): Promise<IssueResponses['listIssues']> => {
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
      const issues = await client.issue.list(repoUrl, query);
      return {
        status: 200,
        body: { success: true, data: issues },
      };
    } catch (error) {
      logger.error({ params, query, error }, 'Failed to fetch issues');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to fetch issues',
        },
      };
    }
  },

  getIssueCount: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string };
    req: Request;
  }): Promise<IssueResponses['getIssueCount']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${params.owner}/${params.repo}`;

    const countResult = {
      all: 0,
      opened: 0,
      closed: 0,
    };

    // 三阶段探测：指数搜索 → 二分查找 → 直接获取最后一页
    const probeCount = async (state: 'all' | 'open' | 'closed'): Promise<number> => {
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
            break;
          } else {
            lower = upper;
            upper *= 10;
          }
        } catch {
          break;
        }
      }

      if (upper > 10000) {
        upper = 10000;
      }

      if (upper - lower < 100) {
        const pageNum = Math.floor(lower / 100) + 1;
        const baseCount = (pageNum - 1) * 100;

        try {
          const issues = await client.issue.list(repoUrl, {
            state,
            page: pageNum,
            per_page: 100,
          });

          return baseCount + issues.length;
        } catch {
          // 回退到二分查找
        }
      }

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

    try {
      const [allCount, openCount, closedCount] = await Promise.all([
        probeCount('all'),
        probeCount('open'),
        probeCount('closed'),
      ]);

      countResult.all = allCount;
      countResult.opened = openCount;
      countResult.closed = closedCount;

      return {
        status: 200,
        body: {
          success: true,
          data: countResult,
          note: 'Accurate count via exponential + binary search',
        },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to probe issue count');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to probe issue count',
        },
      };
    }
  },

  getIssue: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string; number: number };
    req: Request;
  }): Promise<IssueResponses['getIssue']> => {
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
      const issue = await client.issue.get(repoUrl, params.number);
      return {
        status: 200,
        body: { success: true, data: issue },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to fetch issue details');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to fetch issue details',
        },
      };
    }
  },

  createIssue: async ({
    params,
    body,
    req,
  }: {
    params: { owner: string; repo: string };
    body: { title: string; body?: string; labels?: string; assignees?: string };
    req: Request;
  }): Promise<IssueResponses['createIssue']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);

    try {
      const issue = await client.issue.create({
        owner: params.owner,
        repo: params.repo,
        body: {
          title: body.title,
          body: body.body ?? '',
          labels: body.labels,
          assignee: body.assignees,
        },
      });

      logger.info({ params, issueId: issue.id }, 'Issue created');

      return {
        status: 200,
        body: { success: true, data: issue },
      };
    } catch (error) {
      logger.error({ params, title: body.title, error }, 'Failed to create issue');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to create issue',
        },
      };
    }
  },

  updateIssue: async ({
    params,
    body,
    req,
  }: {
    params: { owner: string; repo: string; number: number };
    body: UpdateIssueBody;
    req: Request;
  }): Promise<IssueResponses['updateIssue']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);
    const repoUrl = `https://gitcode.com/${params.owner}/${params.repo}`;

    // Convert state: schema uses 'open'/'closed', client expects 'reopen'/'close'
    const clientState =
      body.state === 'open' ? 'reopen' : body.state === 'closed' ? 'close' : undefined;

    try {
      const issue = await client.issue.update(repoUrl, params.number, {
        title: body.title,
        body: body.body,
        state: clientState,
        labels: body.labels,
        assignee: body.assignees,
      });

      logger.info({ params }, 'Issue updated');

      return {
        status: 200,
        body: { success: true, data: issue },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to update issue');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to update issue',
        },
      };
    }
  },

  getIssueComments: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string; number: number };
    req: Request;
  }): Promise<IssueResponses['getIssueComments']> => {
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
      const comments = await client.issue.comments(repoUrl, params.number);
      return {
        status: 200,
        body: { success: true, data: comments },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to fetch issue comments');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to fetch issue comments',
        },
      };
    }
  },

  createIssueComment: async ({
    params,
    body,
    req,
  }: {
    params: { owner: string; repo: string; number: number };
    body: { body: string };
    req: Request;
  }): Promise<IssueResponses['createIssueComment']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);

    try {
      const comment = await client.issue.createComment({
        owner: params.owner,
        repo: params.repo,
        number: params.number,
        body: { body: body.body },
      });

      logger.info({ params }, 'Issue comment created');

      return {
        status: 200,
        body: { success: true, data: comment },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to create issue comment');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to create issue comment',
        },
      };
    }
  },
};
