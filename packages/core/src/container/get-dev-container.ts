import type Docker from 'dockerode';
import { docker } from './shared';

export async function getDevContainer(): Promise<Docker.Container | undefined> {
  const filters = { label: [`gitany.branch=dev`] };

  const list = await docker.listContainers({ all: true, filters });
  if (list.length > 0) {
    return docker.getContainer(list[0].Id);
  }

  return undefined;
}
