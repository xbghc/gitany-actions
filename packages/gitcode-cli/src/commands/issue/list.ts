import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';
import type { Issue } from '@gitany/gitcode';

export async function listCommand(
  url?: string,
  options: Record<string, string | undefined> = {},
): Promise<void> {
  await withClient(
    async (client) => {
      const repoUrl = await resolveRepoUrl(url);
      const issues: Issue[] = await client.issue.list(repoUrl, {
        state: options.state as 'open' | 'closed' | 'all' | undefined,
        labels: options.label,
        page: options.page ? Number(options.page) : undefined,
        per_page: options.perPage ? Number(options.perPage) : undefined,
      });

      if (options.json) {
        console.log(JSON.stringify(issues, null, 2));
        return;
      }

      for (const issue of issues) {
        const numStr = issue.number || String(issue.id ?? '?');
        const title = issue.title || '(no title)';
        console.log(`[#${numStr}] ${title}`);
      }
    },
    'Failed to list issues',
    {
      onNotFound: () => {
        if (options.json) {
          console.log('[]');
        }
      },
    },
  );
}
