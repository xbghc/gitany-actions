import type { ServerInferResponses } from '@ts-rest/core';
import type { WorkflowConfigContract } from '../contracts/workflow-config.contract.js';
import { workflowConfigService } from '../services/workflow-config-service.js';
import { logger } from '../utils/logger.js';
import { getTokenFromRequest } from '../utils/auth.js';
import type { Request } from 'express';
import type {
  CreateWorkflowConfigBody,
  UpdateWorkflowConfigBody,
} from '../contracts/schemas/workflow-config.js';

type WorkflowConfigResponses = ServerInferResponses<WorkflowConfigContract>;

export const workflowConfigHandler = {
  listWorkflowConfigs: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string };
    req: Request;
  }): Promise<WorkflowConfigResponses['listWorkflowConfigs']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    try {
      const configs = await workflowConfigService.listByRepo(params.owner, params.repo);

      return {
        status: 200,
        body: {
          success: true,
          data: {
            configs,
            count: configs.length,
          },
        },
      };
    } catch (error) {
      logger.error({ params, error }, 'Failed to list workflow configs');
      return {
        status: 500,
        body: {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to list workflow configs',
        },
      };
    }
  },

  createWorkflowConfig: async ({
    params,
    body,
    req,
  }: {
    params: { owner: string; repo: string };
    body: CreateWorkflowConfigBody;
    req: Request;
  }): Promise<WorkflowConfigResponses['createWorkflowConfig']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    try {
      const config = await workflowConfigService.create(params.owner, params.repo, body);

      logger.info({ params, configId: config.id }, 'Workflow config created');

      return {
        status: 200,
        body: {
          success: true,
          data: { config },
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return {
          status: 409,
          body: { success: false, error: 'CONFLICT', message: error.message },
        };
      }

      logger.error({ params, configName: body.name, error }, 'Failed to create workflow config');
      return {
        status: 500,
        body: {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to create workflow config',
        },
      };
    }
  },

  updateWorkflowConfig: async ({
    params,
    body,
    req,
  }: {
    params: { owner: string; repo: string; id: string };
    body: UpdateWorkflowConfigBody;
    req: Request;
  }): Promise<WorkflowConfigResponses['updateWorkflowConfig']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    try {
      const config = await workflowConfigService.update(params.owner, params.repo, params.id, body);

      logger.info({ params }, 'Workflow config updated');

      return {
        status: 200,
        body: {
          success: true,
          data: { config },
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'NOT_FOUND',
            message: `Workflow config not found: ${params.id}`,
          },
        };
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        return {
          status: 409,
          body: { success: false, error: 'CONFLICT', message: error.message },
        };
      }

      logger.error({ params, error }, 'Failed to update workflow config');
      return {
        status: 500,
        body: {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to update workflow config',
        },
      };
    }
  },

  deleteWorkflowConfig: async ({
    params,
    req,
  }: {
    params: { owner: string; repo: string; id: string };
    req: Request;
  }): Promise<WorkflowConfigResponses['deleteWorkflowConfig']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    try {
      await workflowConfigService.delete(params.owner, params.repo, params.id);

      logger.info({ params }, 'Workflow config deleted');

      return {
        status: 200,
        body: {
          success: true,
          message: 'Configuration deleted successfully',
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'NOT_FOUND',
            message: `Workflow config not found: ${params.id}`,
          },
        };
      }

      logger.error({ params, error }, 'Failed to delete workflow config');
      return {
        status: 500,
        body: {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to delete workflow config',
        },
      };
    }
  },
};
