import Docker from 'dockerode';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Docker 节点信息
 */
export interface DockerNode {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'busy';
  lastSeen: string;
  /** 当前运行的任务数 */
  activeJobs: number;
  /** Docker 客户端实例 */
  client: Docker;
}

/**
 * 解析环境变量中的 Docker 节点配置
 *
 * 格式: DOCKER_NODES=name1:host1:port1,name2:host2:port2
 * 例如: DOCKER_NODES=local:192.168.1.100:2375,remote:192.168.1.101:2375
 */
function parseDockerNodesEnv(): Array<{ name: string; host: string; port: number }> {
  const envValue = process.env.DOCKER_NODES;
  if (!envValue) {
    return [];
  }

  const nodes: Array<{ name: string; host: string; port: number }> = [];

  for (const nodeStr of envValue.split(',')) {
    const parts = nodeStr.trim().split(':');
    if (parts.length !== 3) {
      logger.warn({ nodeStr }, 'Invalid DOCKER_NODES entry, expected format: name:host:port');
      continue;
    }

    const [name, host, portStr] = parts;
    const port = parseInt(portStr, 10);

    if (isNaN(port)) {
      logger.warn({ nodeStr }, 'Invalid port in DOCKER_NODES entry');
      continue;
    }

    nodes.push({ name, host, port });
  }

  return nodes;
}

/**
 * Docker 节点服务
 * 从环境变量读取配置，管理远程 Docker daemon 连接
 */
export class DockerNodeService {
  private nodes = new Map<string, DockerNode>();
  private initialized = false;

  /**
   * 初始化：从环境变量加载 Docker 节点
   * 应该在服务启动时调用一次
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const configs = parseDockerNodesEnv();

    if (configs.length === 0) {
      logger.warn(
        'No DOCKER_NODES configured. Set DOCKER_NODES=name:host:port to enable job execution.',
      );
      this.initialized = true;
      return;
    }

    for (const config of configs) {
      try {
        await this.addNode(config.name, config.host, config.port);
        logger.info(
          { name: config.name, host: config.host, port: config.port },
          'Docker node connected',
        );
      } catch (error) {
        logger.error(
          { name: config.name, host: config.host, port: config.port, error },
          'Failed to connect to Docker node',
        );
      }
    }

    this.initialized = true;
    const stats = this.getStats();
    logger.info({ stats }, 'Docker nodes initialized');
  }

  /**
   * 添加一个 Docker 节点（内部使用）
   */
  private async addNode(name: string, host: string, port: number): Promise<DockerNode> {
    const id = randomUUID();

    const client = new Docker({ host, port });

    // 测试连接
    await client.ping();

    const node: DockerNode = {
      id,
      name,
      host,
      port,
      status: 'online',
      lastSeen: new Date().toISOString(),
      activeJobs: 0,
      client,
    };

    this.nodes.set(id, node);
    return node;
  }

  /**
   * 获取一个可用的 Docker 节点
   * 简单的负载均衡：选择活跃任务最少的在线节点
   */
  getAvailableNode(): DockerNode | null {
    let bestNode: DockerNode | null = null;
    let minJobs = Infinity;

    for (const node of this.nodes.values()) {
      if (node.status !== 'offline' && node.activeJobs < minJobs) {
        bestNode = node;
        minJobs = node.activeJobs;
      }
    }

    return bestNode;
  }

  /**
   * 获取指定 ID 的节点
   */
  getNode(nodeId: string): DockerNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): DockerNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 增加节点的活跃任务计数
   */
  incrementActiveJobs(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.activeJobs++;
      node.status = 'busy';
    }
  }

  /**
   * 减少节点的活跃任务计数
   */
  decrementActiveJobs(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.activeJobs = Math.max(0, node.activeJobs - 1);
      if (node.activeJobs === 0) {
        node.status = 'online';
      }
    }
  }

  /**
   * 健康检查 - 检查所有节点的连接状态
   */
  async healthCheck(): Promise<void> {
    for (const node of this.nodes.values()) {
      try {
        await node.client.ping();
        node.status = node.activeJobs > 0 ? 'busy' : 'online';
        node.lastSeen = new Date().toISOString();
      } catch {
        node.status = 'offline';
        logger.warn({ nodeId: node.id, name: node.name }, 'Docker node offline');
      }
    }
  }

  /**
   * 获取节点统计信息
   */
  getStats(): {
    total: number;
    online: number;
    offline: number;
    busy: number;
  } {
    let online = 0;
    let offline = 0;
    let busy = 0;

    for (const node of this.nodes.values()) {
      if (node.status === 'online') online++;
      else if (node.status === 'offline') offline++;
      else if (node.status === 'busy') busy++;
    }

    return {
      total: this.nodes.size,
      online,
      offline,
      busy,
    };
  }
}

// 导出单例
export const dockerNodeService = new DockerNodeService();
