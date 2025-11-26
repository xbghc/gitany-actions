import { Router } from 'express';
import { withAuth } from '../middleware/auth.js';
import { workflowConfigService } from '../services/workflow-config-service.js';
import type {
  CreateWorkflowConfigRequest,
  UpdateWorkflowConfigRequest,
} from '@xbghc/gitcode-actions';
import { logger } from '../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError, InternalError } from '../errors/index.js';

export const workflowConfigRouter: Router = Router();

/**
 * 列出仓库的所有配置
 * GET /api/repos/:owner/:repo/workflows
 */
workflowConfigRouter.get(
  '/repos/:owner/:repo/workflows',
  withAuth(async (req, res) => {
    const { owner, repo } = req.params;

    try {
      const configs = await workflowConfigService.listByRepo(owner, repo);

      res.json({
        success: true,
        data: {
          configs,
          count: configs.length,
        },
      });
    } catch (error) {
      logger.error({ owner, repo, error }, 'Failed to list workflow configs');
      throw new InternalError('Failed to list workflow configs', error as Error);
    }
  }),
);

/**
 * 创建配置
 * POST /api/repos/:owner/:repo/workflows
 */
workflowConfigRouter.post(
  '/repos/:owner/:repo/workflows',
  withAuth(async (req, res) => {
    const { owner, repo } = req.params;
    const request: CreateWorkflowConfigRequest = req.body;

    // 验证必需字段
    if (!request.name || !request.steps || request.steps.length === 0) {
      throw new ValidationError('name and steps are required');
    }

    // 验证 steps 格式
    for (const step of request.steps) {
      if (!step.name || !step.commands || step.commands.length === 0) {
        throw new ValidationError('Each step must have name and commands');
      }
    }

    try {
      const config = await workflowConfigService.create(owner, repo, request);

      logger.info({ owner, repo, configId: config.id }, 'Workflow config created');

      res.json({
        success: true,
        data: {
          config,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new ConflictError(error.message);
      }

      logger.error(
        { owner, repo, configName: request.name, error },
        'Failed to create workflow config',
      );
      throw new InternalError('Failed to create workflow config', error as Error);
    }
  }),
);

/**
 * 更新配置
 * PUT /api/repos/:owner/:repo/workflows/:id
 */
workflowConfigRouter.put(
  '/repos/:owner/:repo/workflows/:id',
  withAuth(async (req, res) => {
    const { owner, repo, id } = req.params;
    const updates: UpdateWorkflowConfigRequest = req.body;

    // 验证 steps 格式（如果提供）
    if (updates.steps) {
      for (const step of updates.steps) {
        if (!step.name || !step.commands || step.commands.length === 0) {
          throw new ValidationError('Each step must have name and commands');
        }
      }
    }

    try {
      const config = await workflowConfigService.update(owner, repo, id, updates);

      logger.info({ owner, repo, configId: id }, 'Workflow config updated');

      res.json({
        success: true,
        data: {
          config,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundError('Workflow config', id);
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        throw new ConflictError(error.message);
      }

      logger.error({ owner, repo, configId: id, error }, 'Failed to update workflow config');
      throw new InternalError('Failed to update workflow config', error as Error);
    }
  }),
);

/**
 * 删除配置
 * DELETE /api/repos/:owner/:repo/workflows/:id
 */
workflowConfigRouter.delete(
  '/repos/:owner/:repo/workflows/:id',
  withAuth(async (req, res) => {
    const { owner, repo, id } = req.params;

    try {
      await workflowConfigService.delete(owner, repo, id);

      logger.info({ owner, repo, configId: id }, 'Workflow config deleted');

      res.json({
        success: true,
        message: 'Configuration deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundError('Workflow config', id);
      }

      logger.error({ owner, repo, configId: id, error }, 'Failed to delete workflow config');
      throw new InternalError('Failed to delete workflow config', error as Error);
    }
  }),
);
