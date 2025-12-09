/**
 * SSE 路由 - ts-rest 不支持 SSE，需要单独处理
 */
import { Router, type Request, type Response } from 'express';
import { workflowService } from '../services/workflow-service.js';
import { isValidGitCodeImageUrl } from '../constants/allowed-domains.js';
import { logger } from '../utils/logger.js';

export const sseRouter: Router = Router();

/**
 * 通过 SSE 实时接收 workflow 输出
 * GET /api/workflow/:workflowId/stream
 */
sseRouter.get('/workflow/:workflowId/stream', (req: Request, res: Response) => {
  const { workflowId } = req.params;

  if (!workflowId) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'workflowId is required',
    });
    return;
  }

  // 检查 workflow 是否存在
  const workflow = workflowService.getWorkflowStatus(workflowId);
  if (!workflow) {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `Workflow not found: ${workflowId}`,
    });
    return;
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

  // 发送初始连接消息
  res.write(`event: connected\ndata: {"workflowId":"${workflowId}"}\n\n`);

  // 如果 workflow 已完成，发送当前状态后关闭
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

  // 订阅 workflow 事件
  const unsubscribe = workflowService.subscribeToWorkflow(workflowId, (message) => {
    const { type, data } = message;

    // 发送 SSE 消息
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);

    // 如果是完成消息，关闭连接
    if (type === 'complete') {
      setTimeout(() => {
        res.end();
      }, 100);
    }
  });

  // 发送心跳，防止连接超时
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  // 客户端断开连接时清理
  req.on('close', () => {
    unsubscribe();
    clearInterval(heartbeatInterval);
  });
});

/**
 * 头像代理 - ts-rest 不适合处理二进制响应
 * GET /api/avatar-proxy?url=https://cdn-img.gitcode.com/...
 */
sseRouter.get('/avatar-proxy', async (req: Request, res: Response) => {
  const avatarUrl = req.query.url as string;

  if (!avatarUrl) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Missing avatar URL',
    });
    return;
  }

  if (!isValidGitCodeImageUrl(avatarUrl)) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid avatar URL domain',
    });
    return;
  }

  try {
    const response = await fetch(avatarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://gitcode.com/',
      },
    });

    if (!response.ok) {
      logger.warn({ avatarUrl, status: response.status }, 'Failed to fetch avatar from upstream');
      res.status(502).json({
        success: false,
        error: 'EXTERNAL_SERVICE_ERROR',
        message: `Failed to fetch avatar: ${response.status}`,
      });
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    logger.error({ avatarUrl, error }, 'Avatar proxy error');
    res.status(500).json({
      success: false,
      error: 'EXTERNAL_SERVICE_ERROR',
      message: 'Failed to proxy avatar',
    });
  }
});
