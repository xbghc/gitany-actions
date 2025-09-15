import type Docker from 'dockerode';

import { docker, ensureDocker } from './shared';

export function getContainer({ pr }: { pr: number }): Docker.Container {
  return docker.getContainer(`pr-${pr}`);
}

export async function getContainerStatus(prId: number) {
  await ensureDocker();
  try {
    const info = await getContainer({ pr: prId }).inspect();
    return info.State?.Status ?? null;
  } catch {
    return null;
  }
}

