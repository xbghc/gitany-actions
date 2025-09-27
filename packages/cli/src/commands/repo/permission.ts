import { withClient } from '../../utils/with-client';
import { resolveRepoUrl } from '@gitany/git-lib';
import { parseGitUrl } from '@gitany/gitcode';

export async function permissionCommand(url: string) {
  await withClient(async (client) => {
    const repoUrl = await resolveRepoUrl(url);
    const { owner, repo } = parseGitUrl(repoUrl) ?? {};
    if (!owner || !repo) {
      throw new Error(`Could not parse owner and repo from URL: ${repoUrl}`);
    }
    const role = await client.repo.getPermissionRole({ owner, repo });
    console.log(role);
  }, 'Failed to get permission role');
}
