import { Router } from 'express';
import { dockerNodeService } from '../services/docker-node-service.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

/**
 * 注册 Docker 节点
 * POST /api/docker-nodes
 */
router.post('/', async (req, res) => {
  try {
    const { name, host, port, tls } = req.body;

    if (!name || !host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, host, port',
      });
    }

    const node = await dockerNodeService.register({
      name,
      host,
      port,
      tls,
    });

    // 返回时不包含 client 实例
    res.json({
      success: true,
      data: {
        id: node.id,
        name: node.name,
        host: node.host,
        port: node.port,
        status: node.status,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to register Docker node');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 获取所有 Docker 节点
 * GET /api/docker-nodes
 */
router.get('/', (_req, res) => {
  const nodes = dockerNodeService.getAllNodes().map((node) => ({
    id: node.id,
    name: node.name,
    host: node.host,
    port: node.port,
    status: node.status,
    lastSeen: node.lastSeen,
    activeJobs: node.activeJobs,
  }));

  res.json({
    success: true,
    data: nodes,
  });
});

/**
 * 获取节点统计
 * GET /api/docker-nodes/stats
 */
router.get('/stats', (_req, res) => {
  const stats = dockerNodeService.getStats();
  res.json({
    success: true,
    data: stats,
  });
});

/**
 * 获取单个 Docker 节点
 * GET /api/docker-nodes/:id
 */
router.get('/:id', (req, res) => {
  const node = dockerNodeService.getNode(req.params.id);

  if (!node) {
    return res.status(404).json({
      success: false,
      error: 'Node not found',
    });
  }

  res.json({
    success: true,
    data: {
      id: node.id,
      name: node.name,
      host: node.host,
      port: node.port,
      status: node.status,
      lastSeen: node.lastSeen,
      activeJobs: node.activeJobs,
    },
  });
});

/**
 * 删除 Docker 节点
 * DELETE /api/docker-nodes/:id
 */
router.delete('/:id', (req, res) => {
  const success = dockerNodeService.unregister(req.params.id);

  if (!success) {
    return res.status(404).json({
      success: false,
      error: 'Node not found',
    });
  }

  res.json({
    success: true,
  });
});

/**
 * 健康检查所有节点
 * POST /api/docker-nodes/health-check
 */
router.post('/health-check', async (_req, res) => {
  try {
    await dockerNodeService.healthCheck();
    const stats = dockerNodeService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
