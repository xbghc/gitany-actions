import { withClient } from '../../utils/with-client';
import { resolveRepoUrl } from '@gitany/git-lib';
import { parseGitUrl } from '@gitany/gitcode';

export async function settingsCommand(url: string) {
  await withClient(async (client) => {
    const repoUrl = await resolveRepoUrl(url);
    const { owner, repo } = parseGitUrl(repoUrl) ?? {};
    if (!owner || !repo) {
      throw new Error(`Could not parse owner and repo from URL: ${repoUrl}`);
    }
    const settings = await client.pulls.getSettings({ owner, repo });
    console.log(JSON.stringify(settings, null, 2));
  }, 'Failed to get PR settings');
}
