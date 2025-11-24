import type Docker from 'dockerode';
import { docker } from './shared.js';
import { getContainerById, findContainers } from './query.js';

/**
 * 启动容器
 * 如果容器已经在运行，则不执行任何操作
 *
 * @param containerOrId - 容器实例或容器 ID
 *
 * @example
 * ```ts
 * await startContainer('abc123');
 * ```
 */
export async function startContainer(containerOrId: Docker.Container | string): Promise<void> {
  const container =
    typeof containerOrId === 'string' ? await getContainerById(containerOrId) : containerOrId;

  if (!container) {
    throw new Error(`Container not found: ${containerOrId}`);
  }

  const info = await container.inspect();
  if (info.State.Running) {
    // 已经在运行，无需启动
    return;
  }

  await container.start();
}

/**
 * 停止容器
 * 如果容器已经停止，则不执行任何操作
 *
 * @param containerOrId - 容器实例或容器 ID
 * @param options - 停止选项
 * @param options.timeout - 强制停止前的等待时间（秒），默认 10 秒
 *
 * @example
 * ```ts
 * await stopContainer('abc123', { timeout: 5 });
 * ```
 */
export async function stopContainer(
  containerOrId: Docker.Container | string,
  options?: { timeout?: number },
): Promise<void> {
  const container =
    typeof containerOrId === 'string' ? await getContainerById(containerOrId) : containerOrId;

  if (!container) {
    throw new Error(`Container not found: ${containerOrId}`);
  }

  const info = await container.inspect();
  if (!info.State.Running) {
    // 已经停止，无需操作
    return;
  }

  await container.stop({ t: options?.timeout ?? 10 });
}

/**
 * 删除容器
 * 如果容器正在运行，会先强制停止
 *
 * @param containerOrId - 容器实例或容器 ID
 * @param options - 删除选项
 * @param options.force - 是否强制删除（即使正在运行），默认 true
 * @param options.volumes - 是否同时删除关联的卷，默认 false
 *
 * @example
 * ```ts
 * await removeContainer('abc123');
 * ```
 */
export async function removeContainer(
  containerOrId: Docker.Container | string,
  options?: { force?: boolean; volumes?: boolean },
): Promise<void> {
  const container =
    typeof containerOrId === 'string' ? await getContainerById(containerOrId) : containerOrId;

  if (!container) {
    // 容器不存在，无需删除
    return;
  }

  await container.remove({
    force: options?.force ?? true,
    v: options?.volumes ?? false,
  });
}

/**
 * 批量删除容器
 * 按标签过滤并删除匹配的所有容器
 *
 * @param labels - 标签过滤条件
 * @returns 删除的容器数量
 *
 * @example
 * ```ts
 * const count = await removeContainersByLabels({
 *   'gitcode.type': 'default',
 *   'gitcode.repo': 'https://gitcode.com/owner/repo'
 * });
 * console.log(`Removed ${count} containers`);
 * ```
 */
export async function removeContainersByLabels(labels: Record<string, string>): Promise<number> {
  const containers = await findContainers(labels);

  let removed = 0;
  for (const containerInfo of containers) {
    try {
      await removeContainer(containerInfo.id);
      removed++;
    } catch (error) {
      // 忽略删除失败的容器（可能已被外部删除）
      console.warn(`Failed to remove container ${containerInfo.id}:`, error);
    }
  }

  return removed;
}

/**
 * 创建原始容器（不包含克隆代码等逻辑）
 * 用于底层操作
 */
export async function createRawContainer(options: {
  image: string;
  env?: string[];
  labels?: Record<string, string>;
}): Promise<import('dockerode').Container> {
  const container = await docker.createContainer({
    Image: options.image,
    Cmd: ['sh', '-lc', 'tail -f /dev/null'],
    Env: options.env,
    User: 'node',
    HostConfig: { AutoRemove: false },
    Labels: options.labels,
  });

  await container.start();
  return container;
}

/**
 * 清理所有 GitCode 管理的容器
 * 删除所有带有 'gitcode.managed=true' 标签的容器
 *
 * @param options - 清理选项
 * @param options.stopOnly - 是否只删除已停止的容器，默认 false
 * @returns 删除的容器数量
 *
 * @example
 * ```ts
 * // 删除所有 GitCode 容器
 * const count = await cleanupManagedContainers();
 *
 * // 只删除已停止的容器
 * const count2 = await cleanupManagedContainers({ stopOnly: true });
 * ```
 */
export async function cleanupManagedContainers(options?: { stopOnly?: boolean }): Promise<number> {
  const filters = {
    label: ['gitcode.managed=true'],
  };

  const list = await docker.listContainers({
    all: true,
    filters,
  });

  let removed = 0;
  for (const item of list) {
    // 如果只删除已停止的容器，跳过运行中的
    if (options?.stopOnly && item.State === 'running') {
      continue;
    }

    try {
      const container = docker.getContainer(item.Id);
      await container.remove({ force: true });
      removed++;
    } catch (error) {
      console.warn(`Failed to remove container ${item.Id}:`, error);
    }
  }

  return removed;
}
