import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';
import { parseGitUrl } from '@gitany/gitcode';

export async function listCommand(
  url?: string,
  options: Record<string, string | undefined> = {},
): Promise<void> {
  await withClient(
    async (client) => {
      const repoUrl = await resolveRepoUrl(url);
      const { owner, repo } = parseGitUrl(repoUrl) ?? {};
      if (!owner || !repo) {
        throw new Error(`Could not parse owner and repo from URL: ${repoUrl}`);
      }

      const pulls = await client.pulls.list({
        owner,
        repo,
        query: {
          state: options.state as 'open' | 'closed' | 'merged' | 'all' | undefined,
          head: options.head,
          base: options.base,
          sort: options.sort,
          direction: options.direction as 'asc' | 'desc' | undefined,
        },
      });

      if (options.json) {
        console.log(JSON.stringify(pulls, null, 2));
        return;
      }

      // Default: print bullet list of titles: - [#<number>] <title>
      for (const pr of pulls as unknown[]) {
        const item = pr as Record<string, unknown>;
        const num = (item.number ?? item.iid ?? item.id) as number | string | undefined;
        const title = (item.title ?? item.subject ?? item.name ?? '(no title)') as string;
        const numStr = typeof num === 'number' ? num : (num ?? '?');
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
