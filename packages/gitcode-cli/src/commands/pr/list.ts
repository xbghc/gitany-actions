import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';
import type { PullRequest } from '@gitany/gitcode';

export async function listCommand(
  url?: string,
  options: Record<string, string | undefined> = {},
): Promise<void> {
  await withClient(
    async (client) => {
      const repoUrl = await resolveRepoUrl(url);
      const pulls: PullRequest[] = await client.pr.list(repoUrl, {
        state: options.state,
        head: options.head,
        base: options.base,
        sort: options.sort,
        direction: options.direction,
      });

      if (options.json) {
        console.log(JSON.stringify(pulls, null, 2));
        return;
      }

      // Default: print bullet list of titles: - [#<number>] <title>
      for (const pr of pulls) {
        const numStr = String(pr.number ?? pr.id ?? '?');
        const title = pr.title || '(no title)';
        console.log(`- [#${numStr}] ${title}`);
      }
    },
    'Failed to list PRs',
    {
      onNotFound: () => {
        if (options.json) {
          console.log('[]');
        }
      },
    },
  );
}
