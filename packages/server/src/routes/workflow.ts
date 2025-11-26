import { Router, type Request, type Response } from 'express';
import { withAuth } from '../middleware/auth.js';
import { workflowService } from '../services/workflow-service.js';
import { workflowConfigService } from '../services/workflow-config-service.js';
import { workflowLogService } from '../services/workflow-log-service.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { ValidationError, NotFoundError, InternalError } from '../errors/index.js';

export const workflowRouter: Router = Router();

/**
 * 触发PR的build和lint测试
 * POST /api/workflow/pr/:number
 */
workflowRouter.post(
  '/workflow/pr/:number',
  withAuth(async (req, res, token) => {
    const { number } = req.params;
    const prNumber = Number(number);

    if (isNaN(prNumber) || prNumber <= 0) {
      throw new ValidationError('Invalid PR number');
    }

    const { owner, repo, configId } = req.body;

    if (!owner || !repo) {
      throw new ValidationError('owner and repo are required');
    }

    // 强制要求 configId
    if (!configId) {
      throw new ValidationError('configId is required', { field: 'configId' });
    }

    // 从指定仓库的配置列表中查找
    const configs = await workflowConfigService.listByRepo(owner, repo);
    const config = configs.find((c) => c.id === configId);

    if (!config) {
      throw new NotFoundError('Configuration', configId);
    }

    const client = createGitCodeClient(token);

    try {
      // 执行配置驱动的 workflow
      const workflowId = await workflowService.executeConfigDrivenWorkflow(
        owner,
        repo,
        prNumber,
        config,
        client,
      );

      logger.info({ owner, repo, prNumber, workflowId }, 'Workflow started');

      res.json({
        success: true,
        data: {
          workflowId,
          status: 'pending',
        },
      });
    } catch (error) {
      logger.error({ owner, repo, prNumber, configId, error }, 'Failed to start workflow');
      throw new InternalError('Failed to start workflow', error as Error);
    }
  }),
);

/**
 * 通过SSE实时接收workflow输出
 * GET /api/workflow/:workflowId/stream
 */
workflowRouter.get('/workflow/:workflowId/stream', (req: Request, res: Response) => {
  const { workflowId } = req.params;

  if (!workflowId) {
    throw new ValidationError('workflowId is required');
  }

  // 检查workflow是否存在
  const workflow = workflowService.getWorkflowStatus(workflowId);
  if (!workflow) {
    throw new NotFoundError('Workflow', workflowId);
  }

  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用nginx缓冲

  // 发送初始连接消息
  res.write(`event: connected\ndata: {"workflowId":"${workflowId}"}\n\n`);

  // 如果workflow已完成，发送当前状态后关闭
  if (workflow.status === 'success' || workflow.status === 'failed') {
    // 发送所有步骤
    for (const step of workflow.steps) {
      res.write(
        `event: step\ndata: ${JSON.stringify({ name: step.name, status: step.status })}\n\n`,
      );
      if (step.output) {
        res.write(
          `event: output\ndata: ${JSON.stringify({ step: step.name, text: step.output })}\n\n`,
        );
      }
    }

    // 发送完成消息
    res.write(
      `event: complete\ndata: ${JSON.stringify({ workflowId, status: workflow.status })}\n\n`,
    );
    res.end();
    return;
  }

  // 订阅workflow事件
  const unsubscribe = workflowService.subscribeToWorkflow(workflowId, (message) => {
    const { type, data } = message;

    // 发送SSE消息
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);

    // 如果是完成消息，关闭连接
    if (type === 'complete') {
      // 延迟一点关闭，确保消息已发送
      setTimeout(() => {
        res.end();
      }, 100);
    }
  });

  // 客户端断开连接时清理
  req.on('close', () => {
    unsubscribe();
  });

  // 发送心跳，防止连接超时
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
  });
});

/**
 * 查询workflow状态
 * GET /api/workflow/:workflowId
 */
workflowRouter.get('/workflow/:workflowId', (req: Request, res: Response) => {
  const { workflowId } = req.params;

  if (!workflowId) {
    throw new ValidationError('workflowId is required');
  }

  const workflow = workflowService.getWorkflowStatus(workflowId);

  if (!workflow) {
    throw new NotFoundError('Workflow', workflowId);
  }

  res.json({
    success: true,
    data: workflow,
  });
});

/**
 * 清理过期的workflow记录
 * DELETE /api/workflow/cleanup
 * 这是一个管理接口，可用于定期清理
 */
workflowRouter.delete('/workflow/cleanup', (req: Request, res: Response) => {
  const { maxAge } = req.query;
  const maxAgeMs = maxAge ? Number(maxAge) : undefined;

  try {
    const deletedCount = workflowService.cleanupOldWorkflows(maxAgeMs);

    logger.info({ deletedCount, maxAgeMs }, 'Workflows cleaned up');

    res.json({
      success: true,
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} old workflow(s)`,
      },
    });
  } catch (error) {
    logger.error({ maxAgeMs, error }, 'Failed to cleanup workflows');
    throw new InternalError('Failed to cleanup workflows', error as Error);
  }
});

/**
 * 测试单个Docker镜像源 - Not Supported on Server
 */
workflowRouter.post('/workflow/test-registry-mirror', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not Implemented',
    message: 'Docker operations are no longer supported on the server. Please check your runner.',
  });
});

/**
 * 测试所有预定义的Docker镜像源 - Not Supported on Server
 */
workflowRouter.get('/workflow/test-all-registry-mirrors', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not Implemented',
    message: 'Docker operations are no longer supported on the server. Please check your runner.',
  });
});

/**
 * 列出指定仓库的所有 workflow
 * GET /api/workflows/:owner/:repo
 */
workflowRouter.get(
  '/workflows/:owner/:repo',
  withAuth(async (req, res) => {
    const { owner, repo } = req.params;

    try {
      const workflows = workflowService.listByRepo(owner, repo);

      res.json({
        success: true,
        data: {
          workflows,
          count: workflows.length,
        },
      });
    } catch (error) {
      logger.error({ owner, repo, error }, 'Failed to list workflows');
      throw new InternalError('Failed to list workflows', error as Error);
    }
  }),
);

/**
 * 获取workflow历史日志列表
 * GET /api/repos/:owner/:repo/workflows/logs
 */
workflowRouter.get(
  '/repos/:owner/:repo/workflows/logs',
  withAuth(async (req, res) => {
    const { owner, repo } = req.params;

    try {
      const result = await workflowLogService.listWorkflowLogs(owner, repo);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ owner, repo, error }, 'Failed to list workflow logs');
      throw new InternalError('Failed to list workflow logs', error as Error);
    }
  }),
);

/**
 * 获取单个workflow的完整数据
 * GET /api/repos/:owner/:repo/workflows/logs/:id
 */
workflowRouter.get(
  '/repos/:owner/:repo/workflows/logs/:id',
  withAuth(async (req, res) => {
    const { owner, repo, id } = req.params;

    try {
      const workflow = await workflowLogService.getWorkflowLog(owner, repo, id);

      if (!workflow) {
        throw new NotFoundError('Workflow log', id);
      }

      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ owner, repo, logId: id, error }, 'Failed to get workflow log');
      throw new InternalError('Failed to get workflow log', error as Error);
    }
  }),
);

/**
 * 删除workflow日志
 * DELETE /api/repos/:owner/:repo/workflows/logs/:id
 */
workflowRouter.delete(
  '/repos/:owner/:repo/workflows/logs/:id',
  withAuth(async (req, res) => {
    const { owner, repo, id } = req.params;

    try {
      const deleted = await workflowLogService.deleteWorkflowLog(owner, repo, id);

      if (!deleted) {
        throw new NotFoundError('Workflow log', id);
      }

      logger.info({ owner, repo, logId: id }, 'Workflow log deleted');

      res.json({
        success: true,
        data: {
          message: `Workflow log deleted: ${id}`,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ owner, repo, logId: id, error }, 'Failed to delete workflow log');
      throw new InternalError('Failed to delete workflow log', error as Error);
    }
  }),
);
