import { resolveRepoUrl } from '@xbghc/git-lib';
import { withClient } from '../../utils/with-client.js';

export async function permissionCommand(url?: string): Promise<void> {
  await withClient(async (client) => {
    const repoUrl = await resolveRepoUrl(url);
    const permission = await client.repo.getSelfRepoPermissionRole(repoUrl);
    console.log(`Repository permission: ${permission}`);
  }, 'Failed to get repo permission');
}
