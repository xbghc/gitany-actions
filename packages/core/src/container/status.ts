import { containers } from './shared';

export async function getPrContainerStatus(prId: number) {
  const entry = containers.get(prId);
  if (!entry) return null;
  const info = await entry.container.inspect();
  return info.State?.Status ?? null;
}

