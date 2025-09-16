import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';

export async function listCommand(
  url?: string,
  options: Record<string, string | undefined> = {},
): Promise<void> {
  await withClient(
    async (client) => {
      try {
        const repoUrl = await resolveRepoUrl(url);
        const issues = await client.issue.list(repoUrl, {
          state: options.state as 'open' | 'closed' | 'all' | undefined,
          labels: options.label,
          page: options.page ? Number(options.page) : undefined,
          per_page: options.perPage ? Number(options.perPage) : undefined,
        });

        if (options.json) {
          console.log(JSON.stringify(issues, null, 2));
          return;
        }

        for (const issue of issues as unknown[]) {
          const item = issue as Record<string, unknown>;
          const num = (item.number ?? item.iid ?? item.id) as number | string | undefined;
          const title = (item.title ?? item.subject ?? item.name ?? '(no title)') as string;
          const numStr = typeof num === 'number' ? num : (num ?? '?');
          console.log(`- [#${numStr}] ${title}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/\b404\b/.test(msg)) {
          if (options.json) {
            console.log('[]');
          }
          return;
        }
        throw err;
      }
    },
    'Failed to list issues',
  );
}
