import type { ServerInferResponses } from '@ts-rest/core';
import type { WorkflowContract } from '../contracts/workflow.contract.js';
import { workflowService } from '../services/workflow-service.js';
import { workflowConfigService } from '../services/workflow-config-service.js';
import { workflowLogService } from '../services/workflow-log-service.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { getTokenFromRequest } from '../utils/auth.js';
import type { Request } from 'express';

type WorkflowResponses = ServerInferResponses<WorkflowContract>;

export const workflowHandler = {
  triggerPRWorkflow: async ({
    params,
    body,
    req,
  }: {
    params: { number: number };
    body: { owner: string; repo: string; configId: string };
    req: Request;
  }): Promise<WorkflowResponses['triggerPRWorkflow']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const prNumber = params.number;
    const { owner, repo, configId } = body;

    // 从指定仓库的配置列表中查找
    const configs = await workflowConfigService.listByRepo(owner, repo);
    const config = configs.find((c) => c.id === configId);

    if (!config) {
      return {
        status: 404,
        body: {
          success: false,
          error: 'NOT_FOUND',
          message: `Configuration not found: ${configId}`,
        },
      };
    }

    const client = createGitCodeClient(token);

    try {
      const workflowId = await workflowService.executeConfigDrivenWorkflow(
        owner,
        repo,
        prNumber,
        config,
        client,
      );

      logger.info({ owner, repo, prNumber, workflowId }, 'Workflow started');

      return {
        status: 200,
        body: {
          success: true,
          data: {
            workflowId,
            status: 'pending',
          },
        },
      };
    } catch (error) {
      logger.error({ owner, repo, prNumber, configId, error }, 'Failed to start workflow');
      return {
        status: 500,
        body: { success: false, error: 'INTERNAL_ERROR', message: 'Failed to start workflow' },
      };
    }
  },

  getWorkflowStatus: async ({
    params,
  }: {
    params: { workflowId: string };
  }): Promise<WorkflowResponses['getWorkflowStatus']> => {
    const workflow = workflowService.getWorkflowStatus(params.workflowId);

    if (!workflow) {
      return {
        status: 404,
        body: {
          success: false,
          error: 'NOT_FOUND',
          message: `Workflow not found: ${params.workflowId}`,
        },
      };
    }

    return {
      status: 200,
      body: { success: true, data: workflow },
    };
  },

  cleanupWorkflows: async ({
    query,
  }: {
    query: { maxAge?: number };
  }): Promise<WorkflowResponses['cleanupWorkflows']> => {
    try {
      const deletedCount = workflowService.cleanupOldWorkflows(query.maxAge);

      logger.info({ deletedCount, maxAge: query.maxAge }, 'Workflows cleaned up');

      return {
        status: 200,
        body: {
          success: true,
          data: {
            deletedCount,
            message: `Cleaned up ${deletedCount} old workflow(s)`,
          },
        },
      };
    } catch (error) {
      logger.error({ maxAge: query.maxAge, error }, 'Failed to cleanup workflows');
      return {
        status: 500,
        body: { success: false, error: 'INTERNAL_ERROR', message: 'Failed to cleanup workflows' },
      };
    }
  },

  listWorkflows: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string };
    req: Request;
  }): Promise<WorkflowResponses['listWorkflows']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    try {
      const workflows = workflowService.listByRepo(params.owner, params.repo);

      return {
        status: 200,
        body: {
          success: true,
          data: {
            workflows,
            count: workflows.length,
          },
        },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to list workflows');
      return {
        status: 500,
        body: { success: false, error: 'INTERNAL_ERROR', message: 'Failed to list workflows' },
      };
    }
  },

  listWorkflowLogs: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string };
    req: Request;
  }): Promise<WorkflowResponses['listWorkflowLogs']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    try {
      const result = await workflowLogService.listWorkflowLogs(params.owner, params.repo);

      return {
        status: 200,
        body: { success: true, data: result },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to list workflow logs');
      return {
        status: 500,
        body: { success: false, error: 'INTERNAL_ERROR', message: 'Failed to list workflow logs' },
      };
    }
  },

  getWorkflowLog: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string; id: string };
    req: Request;
  }): Promise<WorkflowResponses['getWorkflowLog']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    try {
      const workflow = await workflowLogService.getWorkflowLog(
        params.owner,
        params.repo,
        params.id,
      );

      if (!workflow) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'NOT_FOUND',
            message: `Workflow log not found: ${params.id}`,
          },
        };
      }

      return {
        status: 200,
        body: { success: true, data: workflow },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to get workflow log');
      return {
        status: 500,
        body: { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get workflow log' },
      };
    }
  },

  deleteWorkflowLog: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string; id: string };
    req: Request;
  }): Promise<WorkflowResponses['deleteWorkflowLog']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    try {
      const deleted = await workflowLogService.deleteWorkflowLog(
        params.owner,
        params.repo,
        params.id,
      );

      if (!deleted) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'NOT_FOUND',
            message: `Workflow log not found: ${params.id}`,
          },
        };
      }

      logger.info({ params }, 'Workflow log deleted');

      return {
        status: 200,
        body: {
          success: true,
          data: { message: `Workflow log deleted: ${params.id}` },
        },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to delete workflow log');
      return {
        status: 500,
        body: { success: false, error: 'INTERNAL_ERROR', message: 'Failed to delete workflow log' },
      };
    }
  },

  testRegistryMirror: async (): Promise<WorkflowResponses['testRegistryMirror']> => {
    return {
      status: 501,
      body: {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Docker operations are no longer supported on the server',
      },
    };
  },

  testAllRegistryMirrors: async (): Promise<WorkflowResponses['testAllRegistryMirrors']> => {
    return {
      status: 501,
      body: {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Docker operations are no longer supported on the server',
      },
    };
  },
};
