import type Docker from 'dockerode';

import { docker } from './shared';

export async function getContainer({
  pr,
  repoUrl,
}: {
  pr: number;
  repoUrl?: string;
}): Promise<Docker.Container | undefined> {
  const filters: Record<string, string[]> = { label: [`gitany.prId=${pr}`] };
  if (repoUrl) filters.label.push(`gitany.repoUrl=${repoUrl}`);

  const list = await docker.listContainers({ all: true, filters });
  if (list.length) return docker.getContainer(list[0].Id);

  const container = docker.getContainer(`pr-${pr}`);
  try {
    await container.inspect();
    return container;
  } catch {
    return undefined;
  }
}

export async function getContainerByRepo({
  repoUrl,
  branch,
}: {
  repoUrl: string;
  branch: string;
}): Promise<Docker.Container | undefined> {
  const filters: Record<string, string[]> = {
    label: [`gitany.repoUrl=${repoUrl}`, `gitany.branch=${branch}`, `gitany.reusable=true`],
  };

  const list = await docker.listContainers({ all: true, filters });
  if (list.length > 0) {
    list.sort((a, b) => b.Created - a.Created);
    return docker.getContainer(list[0].Id);
  }

  return undefined;
}

export async function getContainerStatus(prId: number) {
  const container = await getContainer({ pr: prId });
  if (!container) return null;
  try {
    const info = await container.inspect();
    return info.State?.Status ?? null;
  } catch {
    return null;
  }
}
