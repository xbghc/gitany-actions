import type Docker from 'dockerode';
import { getContainerByRepo } from './get.js';
import { executor } from '../executor/container-executor.js';

export interface CreateWorkspaceContainerOptions {
  docker: Docker;
  image: string;
  env: string[];
  labels?: Record<string, string>;
  repoUrl?: string;
  branch?: string;
  reusable?: boolean;
}

export class ContainerCreationError extends Error {}

export async function createWorkspaceContainer({
  docker,
  image,
  env,
  labels: customLabels,
  repoUrl,
  branch,
  reusable,
}: CreateWorkspaceContainerOptions): Promise<Docker.Container> {
  if (reusable && repoUrl && branch) {
    const existingContainer = await getContainerByRepo({ repoUrl, branch });
    if (existingContainer) {
      const info = await existingContainer.inspect();
      if (info.State?.Status !== 'running') {
        await existingContainer.start();
      }
      try {
        await executor(existingContainer)
          .execute(`git checkout ${branch}`, { name: '切换分支' })
          .execute('git pull', { name: '拉取最新代码' });
      } catch {
        // 忽略更新失败的错误，继续使用容器
      }
      return existingContainer;
    }
  }

  try {
    const labels: Record<string, string> = { ...customLabels };
    if (reusable && repoUrl && branch) {
      labels['gitcode.repoUrl'] = repoUrl;
      labels['gitcode.branch'] = branch;
      labels['gitcode.reusable'] = 'true';
    }

    const container = await docker.createContainer({
      Image: image,
      Cmd: ['sh', '-lc', 'tail -f /dev/null'],
      Env: env,
      User: 'node',
      HostConfig: { AutoRemove: false },
      Labels: labels,
    });
    await container.start();
    return container;
  } catch (error) {
    throw new ContainerCreationError(error instanceof Error ? error.message : String(error));
  }
}
