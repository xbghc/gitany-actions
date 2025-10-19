import { type CreatePullBody } from '@xbghc/gitcode-api';
import { resolveRepoUrl } from '@xbghc/git-lib';
import { withClient } from '../../utils/with-client';

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
      console.error('Invalid --issue number');
      process.exit(1);
      return;
    }
    body.issue = n;
  }

  await withClient(async (client) => {
    const repoUrl = await resolveRepoUrl(url);
    const created = await client.pr.create(repoUrl, body);

    const pr = created;
    const numStr = String(pr.number ?? pr.id ?? '?');
    const titleOut = pr.title || '(no title)';
    
    if (options.json) {
      console.log(JSON.stringify(created, null, 2));
    } else {
      console.log(`Created PR #${numStr}: ${titleOut}`);
    }
  }, 'Failed to create PR');
}
