import { Router } from 'express';
import { withAuth } from '../middleware/auth.js';
import { workflowConfigService } from '../services/workflow-config-service.js';
import type {
  CreateWorkflowConfigRequest,
  UpdateWorkflowConfigRequest,
} from '@xbghc/gitcode-actions';

export const workflowConfigRouter: Router = Router();

/**
 * 列出仓库的所有配置
 * GET /api/repos/:owner/:repo/workflows
 */
workflowConfigRouter.get(
  '/repos/:owner/:repo/workflows',
  withAuth(async (req, res) => {
    try {
      const { owner, repo } = req.params;

      const configs = await workflowConfigService.listByRepo(owner, repo);

      res.json({
        success: true,
        data: {
          configs,
          count: configs.length,
        },
      });
    } catch (error) {
      console.error('Failed to list workflow configs:', error);
      res.status(500).json({
        success: false,
        error: 'LIST_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
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
    try {
      const { owner, repo } = req.params;
      const request: CreateWorkflowConfigRequest = req.body;

      // 验证必需字段
      if (!request.name || !request.steps || request.steps.length === 0) {
        res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'name and steps are required',
        });
        return;
      }

      // 验证 steps 格式
      for (const step of request.steps) {
        if (!step.name || !step.commands || step.commands.length === 0) {
          res.status(400).json({
            success: false,
            error: 'INVALID_REQUEST',
            message: 'Each step must have name and commands',
          });
          return;
        }
      }

      const config = await workflowConfigService.create(owner, repo, request);

      res.json({
        success: true,
        data: {
          config,
        },
      });
    } catch (error) {
      console.error('Failed to create workflow config:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'CONFIG_EXISTS',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
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
    try {
      const { owner, repo, id } = req.params;
      const updates: UpdateWorkflowConfigRequest = req.body;

      // 验证 steps 格式（如果提供）
      if (updates.steps) {
        for (const step of updates.steps) {
          if (!step.name || !step.commands || step.commands.length === 0) {
            res.status(400).json({
              success: false,
              error: 'INVALID_REQUEST',
              message: 'Each step must have name and commands',
            });
            return;
          }
        }
      }

      const config = await workflowConfigService.update(owner, repo, id, updates);

      res.json({
        success: true,
        data: {
          config,
        },
      });
    } catch (error) {
      console.error('Failed to update workflow config:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'CONFIG_NOT_FOUND',
          message: error.message,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'CONFIG_EXISTS',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
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
    try {
      const { owner, repo, id } = req.params;

      await workflowConfigService.delete(owner, repo, id);

      res.json({
        success: true,
        message: 'Configuration deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete workflow config:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'CONFIG_NOT_FOUND',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);
