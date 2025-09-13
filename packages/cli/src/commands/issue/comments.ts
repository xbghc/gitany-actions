import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { resolveRepoUrl } from '../../utils';

const logger = createLogger('@gitany/cli');

export async function commentsCommand(
  urlOrNumber: string | undefined,
  numberOrOptions?: string | Record<string, string | undefined>,
  maybeOptions?: Record<string, string | undefined>,
): Promise<void> {
  let url: string | undefined = urlOrNumber;
  let issueNumber: string | undefined;
  let options: Record<string, string | undefined> = {};

  if (typeof numberOrOptions === 'string') {
    issueNumber = numberOrOptions;
    options = maybeOptions ?? {};
  } else {
    issueNumber = urlOrNumber;
    url = undefined;
    options = numberOrOptions ?? {};
  }

  const n = Number(issueNumber);
  if (!Number.isFinite(n) || n <= 0) {
    logger.error('Invalid issue number');
    process.exit(1);
    return;
  }

  try {
    const repoUrl = await resolveRepoUrl(url);
    const client = new GitcodeClient();
    const comments = await client.issue.comments(repoUrl, n, {
      page: options.page ? Number(options.page) : undefined,
      per_page: options.perPage ? Number(options.perPage) : undefined,
    });

    if (options.json) {
      console.log(JSON.stringify(comments, null, 2));
      return;
    }

    for (const comment of comments as unknown[]) {
      const item = comment as Record<string, unknown>;
      const id = (item.id ?? item.comment_id ?? '?') as number | string;
      const body = (item.body ?? '').toString().split('\n')[0];
      console.log(`- [#${id}] ${body}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/\b404\b/.test(msg)) {
      if (options.json) {
        console.log('[]');
      }
      return;
    }
    logger.error({ err }, 'Failed to list issue comments');
    process.exit(1);
  }
}
