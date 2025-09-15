import { ensureDocker } from './shared';
import { getContainer } from './get';

export async function removeContainer(prId: number) {
  await ensureDocker();
  const container = getContainer({ pr: prId });
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

