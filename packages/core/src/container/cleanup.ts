import { docker, logger } from './shared';

/**
 * Scan and remove stale PR containers.
 * Containers are identified by the `gitany.prId` label.
 * Any container that is not in `running` state will be force removed.
 */
export async function cleanupPrContainers() {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: ['gitany.prId'] },
  });
  for (const info of containers) {
    if (info.State !== 'running') {
      const container = docker.getContainer(info.Id);
      try {
        await container.remove({ force: true });
        logger.info(
          { id: info.Id, state: info.State },
          '[cleanupPrContainers] removed stale container',
        );
      } catch (err) {
        logger.warn({ err, id: info.Id }, '[cleanupPrContainers] failed to remove container');
      }
    }
  }
}
