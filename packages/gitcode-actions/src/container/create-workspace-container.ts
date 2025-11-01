import type Docker from 'dockerode';
import type { Logger } from '../utils/logger.js';
import { getContainerByRepo } from './get.js';
import { executeStep } from './execute-step.js';

export interface CreateWorkspaceContainerOptions {
  docker: Docker;
  image: string;
  env: string[];
  log: Logger;
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
  log,
  labels: customLabels,
  repoUrl,
  branch,
  reusable,
}: CreateWorkspaceContainerOptions): Promise<Docker.Container> {
  if (reusable && repoUrl && branch) {
    const existingContainer = await getContainerByRepo({ repoUrl, branch });
    if (existingContainer) {
      log.debug(`🐳 发现已有的容器，ID: ${existingContainer.id}`);
      const info = await existingContainer.inspect();
      if (info.State?.Status !== 'running') {
        await existingContainer.start();
      }
      log.debug(`🔄 更新容器中的代码`);
      await executeStep({
        container: existingContainer,
        name: 'Update Code',
        script: `git checkout ${branch} && git pull`,
        log,
      });
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
    log.debug(`🐳 容器已创建，ID: ${container.id}`);
    return container;
  } catch (error) {
    throw new ContainerCreationError(error instanceof Error ? error.message : String(error));
  }
}
