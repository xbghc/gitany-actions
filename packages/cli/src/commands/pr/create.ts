import { GitcodeClient, type CreatePullBody } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { resolveRepoUrl } from '../../utils';

const logger = createLogger('@gitany/cli');

export async function createCommand(
  url: string | undefined,
  options: Record<string, string | undefined>,
): Promise<void> {
  try {
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

    const repoUrl = await resolveRepoUrl(url);
    const client = new GitcodeClient();
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
  } catch (err) {
    logger.error({ err }, 'Failed to create PR');
    process.exit(1);
  }
}
