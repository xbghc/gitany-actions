import { containers } from './store';

export async function removePrContainer(prId: number) {
  const entry = containers.get(prId);
  if (!entry) return;
  try {
    await entry.container.stop({ t: 0 });
  } catch {
    /* ignore */
  }
  try {
    await entry.container.remove({ force: true });
  } catch {
    /* ignore */
  }
  containers.delete(prId);
}

