import Docker from 'dockerode';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Docker 节点配置
 */
export interface DockerNodeConfig {
  /** 节点名称 */
  name: string;
  /** Docker daemon 地址 */
  host: string;
  /** Docker daemon 端口 */
  port: number;
  /** TLS 配置（可选，局域网可不用） */
  tls?: {
    ca: string;
    cert: string;
    key: string;
  };
}

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
 * Docker 节点服务
 * 管理远程 Docker daemon 连接
 */
export class DockerNodeService {
  private nodes = new Map<string, DockerNode>();

  /**
   * 注册一个 Docker 节点
   */
  async register(config: DockerNodeConfig): Promise<DockerNode> {
    const id = randomUUID();

    // 创建 Docker 客户端
    const dockerOptions: Docker.DockerOptions = {
      host: config.host,
      port: config.port,
    };

    if (config.tls) {
      dockerOptions.ca = config.tls.ca;
      dockerOptions.cert = config.tls.cert;
      dockerOptions.key = config.tls.key;
    }

    const client = new Docker(dockerOptions);

    // 测试连接
    try {
      await client.ping();
    } catch (error) {
      throw new Error(
        `无法连接到 Docker 节点 ${config.host}:${config.port}: ${error instanceof Error ? error.message : error}`,
      );
    }

    const node: DockerNode = {
      id,
      name: config.name,
      host: config.host,
      port: config.port,
      status: 'online',
      lastSeen: new Date().toISOString(),
      activeJobs: 0,
      client,
    };

    this.nodes.set(id, node);
    logger.info({ nodeId: id, name: config.name, host: config.host }, 'Docker node registered');

    return node;
  }

  /**
   * 移除一个 Docker 节点
   */
  unregister(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    this.nodes.delete(nodeId);
    logger.info({ nodeId, name: node.name }, 'Docker node unregistered');
    return true;
  }

  /**
   * 获取一个可用的 Docker 节点
   * 简单的负载均衡：选择活跃任务最少的在线节点
   */
  getAvailableNode(): DockerNode | null {
    let bestNode: DockerNode | null = null;
    let minJobs = Infinity;

    for (const node of this.nodes.values()) {
      if (node.status === 'online' && node.activeJobs < minJobs) {
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
