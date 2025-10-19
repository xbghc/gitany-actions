import { getContainer } from './get';

export async function removeContainer(prId: number) {
  const container = await getContainer({ pr: prId });
  if (!container) return;
  try {
    await container.stop({ t: 0 });
  } catch {
    /* ignore */
  }
  try {
    await container.remove({ force: true });
  } catch {
    /* ignore */
  }
}
