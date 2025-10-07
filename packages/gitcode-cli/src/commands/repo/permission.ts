import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';

export async function permissionCommand(url?: string): Promise<void> {
  await withClient(async (client) => {
    const resolved = await resolveRepoUrl(url);
    const repoUrl = resolved.repoUrl;
    const permission = await client.repo.getSelfRepoPermissionRole(repoUrl);
    console.log(`Repository permission: ${permission}`);
  }, 'Failed to get repo permission');
}
