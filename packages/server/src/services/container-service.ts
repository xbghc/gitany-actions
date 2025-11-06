import {
  createContainer,
  findContainers,
  getContainerById,
  removeContainer,
  resetContainer,
  type ContainerInfo,
  type CreateContainerConfig,
} from '@xbghc/gitcode-actions';

/**
 * 容器管理服务
 * 提供容器的 CRUD 操作，基于 @xbghc/gitcode-actions 的原子化 API
 */
class ContainerService {
  /**
   * 创建容器
   */
  async create(
    repoUrl: string,
    options?: {
      branch?: string;
      image?: string;
      labels?: Record<string, string>;
    },
  ): Promise<{ containerId: string; info: ContainerInfo }> {
    const config: CreateContainerConfig = {
      repoUrl,
      branch: options?.branch,
      image: options?.image || 'node:22-bookworm',
      labels: {
        'gitcode.repo': repoUrl,
        ...options?.labels,
      },
    };

    const { id } = await createContainer(config);

    // 获取容器详细信息
    const containers = await findContainers({
      'gitcode.repo': repoUrl,
    });

    const info = containers.find((c) => c.id === id);
    if (!info) {
      throw new Error(`Container ${id} was created but not found in list`);
    }

    return { containerId: id, info };
  }

  /**
   * 列出指定仓库的所有容器
   */
  async list(repoUrl: string): Promise<Array<{ containerId: string; info: ContainerInfo }>> {
    const containers = await findContainers({
      'gitcode.repo': repoUrl,
    });

    return containers.map((info) => ({
      containerId: info.id,
      info,
    }));
  }

  /**
   * 通过 ID 获取容器
   */
  async getById(containerId: string): Promise<ContainerInfo | null> {
    const container = await getContainerById(containerId);
    if (!container) {
      return null;
    }

    const info = await container.inspect();
    return {
      id: info.Id,
      name: info.Name.startsWith('/') ? info.Name.slice(1) : info.Name,
      status: info.State.Running
        ? 'running'
        : info.State.Paused
          ? 'paused'
          : info.State.Restarting
            ? 'restarting'
            : info.State.Dead
              ? 'dead'
              : info.State.Status === 'exited'
                ? 'exited'
                : 'stopped',
      image: info.Config.Image,
      labels: info.Config.Labels || {},
      created: new Date(info.Created),
    };
  }

  /**
   * 重置容器
   */
  async reset(containerId: string, options?: { branch?: string }): Promise<void> {
    const container = await getContainerById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    await resetContainer(container, {
      branch: options?.branch,
    });
  }

  /**
   * 删除容器
   */
  async remove(containerId: string): Promise<void> {
    await removeContainer(containerId);
  }

  /**
   * 列出所有容器
   */
  async listAll(): Promise<Array<{ repoUrl: string; containerId: string; info: ContainerInfo }>> {
    const containers = await findContainers({
      'gitcode.managed': 'true',
    });

    return containers.map((info) => ({
      repoUrl: info.labels['gitcode.repo'] || '',
      containerId: info.id,
      info,
    }));
  }
}

// 导出单例
export const containerService = new ContainerService();
