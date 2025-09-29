import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';
import { createLogger } from '@gitany/shared';

const logger = createLogger('gitcode-cli:repo');

export async function permissionCommand(url?: string): Promise<void> {
  await withClient(async (client) => {
    const repoUrl = await resolveRepoUrl(url);
    const permission = await client.repo.getSelfRepoPermissionRole(repoUrl);
    logger.info({ permission }, 'Repository permission');
  }, 'Failed to get repo permission');
}
