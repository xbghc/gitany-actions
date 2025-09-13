import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { resolveRepoUrl } from '@gitany/git-lib';

const logger = createLogger('@gitany/cli');

export async function listCommand(
  url?: string,
  options: Record<string, string | undefined> = {},
): Promise<void> {
  try {
    const client = new GitcodeClient();
    const repoUrl = await resolveRepoUrl(url);
    const pulls = await client.pr.list(repoUrl, {
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
    for (const pr of pulls as unknown[]) {
      const item = pr as Record<string, unknown>;
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
    logger.error({ err }, 'Failed to list PRs');
    process.exit(1);
  }
}
