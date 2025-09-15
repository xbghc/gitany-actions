import type Docker from 'dockerode';
import type { Logger } from '@gitany/shared';

export interface CreateWorkspaceContainerOptions {
  docker: Docker;
  image: string;
  env: string[];
  log: Logger;
}

export class ContainerCreationError extends Error {}

export async function createWorkspaceContainer({
  docker,
  image,
  env,
  log,
}: CreateWorkspaceContainerOptions): Promise<Docker.Container> {
  try {
    const container = await docker.createContainer({
      Image: image,
      Cmd: ['sh', '-lc', 'tail -f /dev/null'],
      Env: env,
      User: 'node',
      HostConfig: { AutoRemove: false },
    });
    await container.start();
    log.debug(`🐳 容器已创建，ID: ${container.id}`);
    return container;
  } catch (error) {
    throw new ContainerCreationError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

