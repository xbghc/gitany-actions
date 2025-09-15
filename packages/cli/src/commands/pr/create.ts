import { type CreatePullBody } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';

const logger = createLogger('@gitany/cli');

export async function createCommand(
  url?: string,
  options: Record<string, string | undefined> = {},
): Promise<void> {
  const body: CreatePullBody = {
    title: options.title,
    head: options.head,
  };

  if (options.base) body.base = options.base;
  if (options.body) body.body = options.body;
  if (options.issue) {
    const n = Number(options.issue);
    if (!Number.isFinite(n) || n <= 0) {
      logger.error('Invalid --issue number');
      process.exit(1);
      return;
    }
    body.issue = n;
  }

  await withClient(
    async (client) => {
      const repoUrl = await resolveRepoUrl(url);
      const created = await client.pr.create(repoUrl, body);

      if (options.json) {
        console.log(JSON.stringify(created, null, 2));
        return;
      }

      const pr = created as Record<string, unknown>;
      const num = (pr.number ?? pr.iid ?? pr.id) as number | string | undefined;
      const titleOut = (pr.title ?? '(no title)') as string;
      const numStr = typeof num === 'number' ? num : (num ?? '?');
      console.log(`Created PR #${numStr}: ${titleOut}`);
    },
    'Failed to create PR',
  );
}
