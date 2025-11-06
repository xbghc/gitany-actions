import { Router } from 'express';
import { withAuth } from '../middleware/auth.js';
import { containerService } from '../services/container-service.js';
import { toGitUrl } from '@xbghc/gitcode-api';

export const containerRouter: Router = Router();

/**
 * 创建容器
 * POST /api/container
 */
containerRouter.post(
  '/container',
  withAuth(async (req, res) => {
    try {
      const { owner, repo, branch, image, labels } = req.body;

      if (!owner || !repo) {
        res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'owner and repo are required',
        });
        return;
      }

      const repoUrl = toGitUrl(`https://gitcode.com/${owner}/${repo}`);

      const result = await containerService.create(repoUrl, {
        branch,
        image,
        labels,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Failed to create container:', error);
      res.status(500).json({
        success: false,
        error: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * 列出仓库的所有容器
 * GET /api/containers/:owner/:repo
 */
containerRouter.get(
  '/containers/:owner/:repo',
  withAuth(async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const repoUrl = toGitUrl(`https://gitcode.com/${owner}/${repo}`);

      const containers = await containerService.list(repoUrl);

      res.json({
        success: true,
        data: {
          containers,
          count: containers.length,
        },
      });
    } catch (error) {
      console.error('Failed to list containers:', error);
      res.status(500).json({
        success: false,
        error: 'LIST_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * 获取容器详情
 * GET /api/container/:containerId
 */
containerRouter.get(
  '/container/:containerId',
  withAuth(async (req, res) => {
    try {
      const { containerId } = req.params;

      const info = await containerService.getById(containerId);

      if (!info) {
        res.status(404).json({
          success: false,
          error: 'CONTAINER_NOT_FOUND',
          message: `Container not found: ${containerId}`,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          info,
        },
      });
    } catch (error) {
      console.error('Failed to get container:', error);
      res.status(500).json({
        success: false,
        error: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * 重置容器
 * POST /api/container/:containerId/reset
 */
containerRouter.post(
  '/container/:containerId/reset',
  withAuth(async (req, res) => {
    try {
      const { containerId } = req.params;
      const { branch } = req.body;

      await containerService.reset(containerId, { branch });

      res.json({
        success: true,
        message: 'Container reset successfully',
      });
    } catch (error) {
      console.error('Failed to reset container:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'CONTAINER_NOT_FOUND',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'RESET_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * 删除容器
 * DELETE /api/container/:containerId
 */
containerRouter.delete(
  '/container/:containerId',
  withAuth(async (req, res) => {
    try {
      const { containerId } = req.params;

      await containerService.remove(containerId);

      res.json({
        success: true,
        message: 'Container deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete container:', error);
      res.status(500).json({
        success: false,
        error: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * 列出所有容器
 * GET /api/containers
 */
containerRouter.get(
  '/containers',
  withAuth(async (req, res) => {
    try {
      const containers = await containerService.listAll();

      res.json({
        success: true,
        data: {
          containers,
          count: containers.length,
        },
      });
    } catch (error) {
      console.error('Failed to list all containers:', error);
      res.status(500).json({
        success: false,
        error: 'LIST_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);
