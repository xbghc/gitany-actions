import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';

export async function permissionCommand(url?: string): Promise<void> {
  await withClient(
    async (client) => {
      const repoUrl = await resolveRepoUrl(url);
      const permission = await client.repo.getSelfRepoPermissionRole(repoUrl);
      console.log(permission);
    },
    'Failed to get repo permission',
  );
}
