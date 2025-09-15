import type Docker from 'dockerode';

import { containers } from './store';

export function getPrContainer(prId: number): Docker.Container | undefined {
  return containers.get(prId)?.container;
}

export async function getPrContainerStatus(prId: number) {
  const entry = containers.get(prId);
  if (!entry) return null;
  const info = await entry.container.inspect();
  return info.State?.Status ?? null;
}
