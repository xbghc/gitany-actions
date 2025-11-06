import type Docker from 'dockerode';
import { docker } from './shared.js';

export interface ContainerInfo {
  /** 容器唯一 ID */
  id: string;
  /** 容器名称 */
  name: string;
  /** 容器状态 */
  status: 'running' | 'stopped' | 'exited' | 'paused' | 'restarting' | 'dead';
  /** Docker 镜像 */
  image: string;
  /** 容器标签 */
  labels: Record<string, string>;
  /** 创建时间 */
  created: Date;
  /** 当前 Git 分支（如果是 Git 仓库容器） */
  currentBranch?: string;
  /** 当前 Git commit SHA */
  currentSha?: string;
}

/**
 * 根据容器 ID 或名称获取容器实例
 * 支持完整 ID、ID 前缀或容器名称作为输入
 *
 * @param idOrName - 容器 ID、ID 前缀或容器名称
 * @returns 容器实例，如果不存在则返回 null
 *
 * @example
 * ```ts
 * // 通过名称查询
 * const container1 = await getContainerById('workflow-test-123');
 *
 * // 通过完整 ID 查询
 * const container2 = await getContainerById('abc123def456...');
 *
 * // 通过 ID 前缀查询
 * const container3 = await getContainerById('abc123');
 * ```
 */
export async function getContainerById(idOrName: string): Promise<Docker.Container | null> {
  try {
    // 步骤 1: 列出所有容器（包括停止的）
    const containers = await docker.listContainers({ all: true });

    // 步骤 2: 查找匹配的容器（支持 ID、ID 前缀、名称）
    const match = containers.find((c) => {
      // 匹配完整 ID
      if (c.Id === idOrName) return true;

      // 匹配 ID 前缀（Docker CLI 风格）
      if (c.Id.startsWith(idOrName)) return true;

      // 匹配容器名称（注意 Docker 返回的名称带前导 /）
      if (
        c.Names.some(
          (name) => name === `/${idOrName}` || name === idOrName || name.substring(1) === idOrName,
        )
      ) {
        return true;
      }

      return false;
    });

    if (!match) {
      return null;
    }

    // 步骤 3: 使用确定的 ID 获取容器实例
    const container = docker.getContainer(match.Id);

    // 步骤 4: 验证容器可访问
    await container.inspect();

    return container;
  } catch (error: unknown) {
    // 404 表示容器不存在（理论上不会到这里，因为已通过 listContainers 验证）
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * 按标签查找容器
 * 可能返回多个结果
 *
 * @param labels - 标签过滤条件
 * @returns 匹配的容器信息列表
 *
 * @example
 * ```ts
 * const containers = await findContainers({
 *   'gitcode.type': 'default',
 *   'gitcode.repo': 'https://gitcode.com/owner/repo'
 * });
 * ```
 */
export async function findContainers(labels: Record<string, string>): Promise<ContainerInfo[]> {
  const filters = {
    label: Object.entries(labels).map(([key, value]) => `${key}=${value}`),
  };

  const list = await docker.listContainers({
    all: true,
    filters,
  });

  return list.map((item) => ({
    id: item.Id,
    name: item.Names[0]?.replace(/^\//, '') || '',
    status: mapStatus(item.State),
    image: item.Image,
    labels: item.Labels || {},
    created: new Date(item.Created * 1000),
  }));
}

/**
 * 获取容器的详细信息
 * 包括 Git 状态（如果是 Git 仓库容器）
 *
 * @param containerOrId - 容器实例或容器 ID
 * @returns 容器详细信息
 *
 * @example
 * ```ts
 * const info = await getContainerInfo('abc123');
 * console.log(info.currentBranch);
 * ```
 */
export async function getContainerInfo(
  containerOrId: Docker.Container | string,
): Promise<ContainerInfo> {
  const container =
    typeof containerOrId === 'string' ? await getContainerById(containerOrId) : containerOrId;

  if (!container) {
    throw new Error(`Container not found: ${containerOrId}`);
  }

  const info = await container.inspect();

  let currentBranch: string | undefined;
  let currentSha: string | undefined;

  // 如果容器运行中，尝试获取 Git 状态
  if (info.State.Running) {
    try {
      // 获取当前分支
      const branchExec = await container.exec({
        Cmd: ['sh', '-c', 'git -C /workspace branch --show-current 2>/dev/null || true'],
        AttachStdout: true,
        AttachStderr: false,
      });
      const branchStream = await branchExec.start({ hijack: false });
      currentBranch = await streamToString(branchStream);

      // 获取当前 commit SHA
      const shaExec = await container.exec({
        Cmd: ['sh', '-c', 'git -C /workspace rev-parse HEAD 2>/dev/null || true'],
        AttachStdout: true,
        AttachStderr: false,
      });
      const shaStream = await shaExec.start({ hijack: false });
      currentSha = await streamToString(shaStream);
    } catch {
      // 忽略 Git 命令失败（可能不是 Git 仓库）
    }
  }

  return {
    id: info.Id,
    name: info.Name.replace(/^\//, ''),
    status: mapStatus(info.State.Status),
    image: info.Config.Image,
    labels: info.Config.Labels || {},
    created: new Date(info.Created),
    currentBranch,
    currentSha,
  };
}

/**
 * 映射 Docker 状态到标准状态
 */
function mapStatus(
  state: string,
): 'running' | 'stopped' | 'exited' | 'paused' | 'restarting' | 'dead' {
  const normalized = state.toLowerCase();
  if (normalized === 'running') return 'running';
  if (normalized === 'paused') return 'paused';
  if (normalized === 'restarting') return 'restarting';
  if (normalized === 'dead') return 'dead';
  if (normalized === 'exited') return 'exited';
  return 'stopped';
}

/**
 * 将流转换为字符串
 */
async function streamToString(stream: NodeJS.ReadableStream): Promise<string | undefined> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => {
      const output = Buffer.concat(chunks).toString('utf8').trim();
      resolve(output || undefined);
    });
    stream.on('error', reject);
  });
}
