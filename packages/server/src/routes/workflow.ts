import { Router, type Request, type Response } from 'express';
import { withAuth } from '../middleware/auth.js';
import { workflowService } from '../services/workflow-service.js';
import { workflowConfigService } from '../services/workflow-config-service.js';
import type { RegistryMirrorTestResult } from '../types/workflow.js';
import { testRegistryMirror } from '../utils/docker-runner.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';

export const workflowRouter: Router = Router();

/**
 * 触发PR的build和lint测试
 * POST /api/workflow/pr/:number
 */
workflowRouter.post(
  '/workflow/pr/:number',
  withAuth(async (req, res, token) => {
    try {
      const { number } = req.params;
      const prNumber = Number(number);

      if (isNaN(prNumber) || prNumber <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid PR number',
        });
        return;
      }

      const { owner, repo, configId } = req.body;

      if (!owner || !repo) {
        res.status(400).json({
          success: false,
          error: 'owner and repo are required',
        });
        return;
      }

      // 强制要求 configId
      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'CONFIG_ID_REQUIRED',
          message: 'configId is required',
        });
        return;
      }

      // 从指定仓库的配置列表中查找
      const configs = await workflowConfigService.listByRepo(owner, repo);
      const config = configs.find((c) => c.id === configId);

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'CONFIG_NOT_FOUND',
          message: `Configuration not found: ${configId}`,
        });
        return;
      }

      const client = createGitCodeClient(token);

      // 执行配置驱动的 workflow
      const workflowId = await workflowService.executeConfigDrivenWorkflow(
        owner,
        repo,
        prNumber,
        config,
        client,
      );

      res.json({
        success: true,
        data: {
          workflowId,
          status: 'pending',
        },
      });
    } catch (error) {
      console.error('Failed to start workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
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
    res.status(400).json({
      success: false,
      error: 'workflowId is required',
    });
    return;
  }

  // 检查workflow是否存在
  const workflow = workflowService.getWorkflowStatus(workflowId);
  if (!workflow) {
    res.status(404).json({
      success: false,
      error: 'Workflow not found',
    });
    return;
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
  try {
    const { workflowId } = req.params;

    if (!workflowId) {
      res.status(400).json({
        success: false,
        error: 'workflowId is required',
      });
      return;
    }

    const workflow = workflowService.getWorkflowStatus(workflowId);

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
        message: `Workflow ${workflowId} does not exist or has been cleaned up`,
      });
      return;
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error('Failed to get workflow status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 清理过期的workflow记录
 * DELETE /api/workflow/cleanup
 * 这是一个管理接口，可用于定期清理
 */
workflowRouter.delete('/workflow/cleanup', (req: Request, res: Response) => {
  try {
    const { maxAge } = req.query;
    const maxAgeMs = maxAge ? Number(maxAge) : undefined;

    const deletedCount = workflowService.cleanupOldWorkflows(maxAgeMs);

    res.json({
      success: true,
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} old workflow(s)`,
      },
    });
  } catch (error) {
    console.error('Failed to cleanup workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup workflows',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 测试单个Docker镜像源
 * POST /api/workflow/test-registry-mirror
 * Body: { mirror?, mirrorName?, testImage? }
 */
workflowRouter.post('/workflow/test-registry-mirror', async (req: Request, res: Response) => {
  try {
    const { mirror, mirrorName, testImage } = req.body;

    const result: RegistryMirrorTestResult = await testRegistryMirror(
      mirror,
      mirrorName,
      testImage,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to test registry mirror:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test registry mirror',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 测试所有预定义的Docker镜像源
 * GET /api/workflow/test-all-registry-mirrors?testImage=node:22-alpine
 */
workflowRouter.get('/workflow/test-all-registry-mirrors', async (req: Request, res: Response) => {
  try {
    // 从query参数获取测试镜像，默认alpine:latest
    const testImage = (req.query.testImage as string) || undefined;

    // 预定义的镜像源列表（2025年可用）
    const mirrors = [
      { mirror: 'docker.m.daocloud.io', name: 'DaoCloud镜像源（推荐）' },
      { mirror: 'docker.1panel.live', name: '1Panel镜像源' },
      { mirror: 'docker.1ms.run', name: '1ms镜像源' },
      { mirror: 'hub.rat.dev', name: 'Rat镜像源' },
      { mirror: 'docker.xuanyuan.me', name: '轩辕镜像源' },
      { mirror: '', name: 'Docker Hub（直连）' },
    ];

    // 并发测试所有镜像源
    const results: RegistryMirrorTestResult[] = await Promise.all(
      mirrors.map(({ mirror, name }) =>
        testRegistryMirror(mirror, name, testImage).catch((error) => ({
          success: false,
          mirror,
          mirrorName: name,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
      ),
    );

    // 按速度排序（成功的在前，失败的在后；成功的按速度降序）
    results.sort((a, b) => {
      if (a.success && !b.success) return -1;
      if (!a.success && b.success) return 1;
      if (a.success && b.success) {
        return (b.speed || 0) - (a.speed || 0);
      }
      return 0;
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Failed to test all registry mirrors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test all registry mirrors',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 列出指定仓库的所有 workflow
 * GET /api/workflows/:owner/:repo
 */
workflowRouter.get(
  '/workflows/:owner/:repo',
  withAuth(async (req, res) => {
    try {
      const { owner, repo } = req.params;

      const workflows = workflowService.listByRepo(owner, repo);

      res.json({
        success: true,
        data: {
          workflows,
          count: workflows.length,
        },
      });
    } catch (error) {
      console.error('Failed to list workflows:', error);
      res.status(500).json({
        success: false,
        error: 'LIST_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);
