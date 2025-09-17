import type { PRCommentQueryOptions } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';

const logger = createLogger('@gitany/cli');

function isPrCommentType(
  val: string | undefined,
): val is NonNullable<PRCommentQueryOptions['comment_type']> {
  return val === 'diff_comment' || val === 'pr_comment';
}

export async function prCommentsCommand(
  prNumber: string,
  url?: string,
  options: Record<string, string | undefined> = {},
): Promise<void> {
  const n = Number(prNumber);
  if (!Number.isFinite(n) || n <= 0) {
    logger.error('Invalid PR number');
    process.exit(1);
    return;
  }

  await withClient(
    async (client) => {
      const repoUrl = await resolveRepoUrl(url);
      const comments = await client.pr.comments(repoUrl, n, {
        page: options.page ? Number(options.page) : undefined,
        per_page: options.perPage ? Number(options.perPage) : undefined,
        comment_type: isPrCommentType(options.commentType)
          ? options.commentType
          : undefined,
      });

      if (options.json) {
        console.log(JSON.stringify(comments, null, 2));
        return;
      }

      for (const comment of comments as unknown[]) {
        const item = comment as Record<string, unknown>;
        const id = (item.id ?? item.comment_id ?? '?') as number | string;
        const body = (item.body ?? '').toString().split('\n')[0];
        const createdAt = (item.created_at ?? '') as string;
        const author = (item.user as Record<string, unknown>)?.login ?? '?';

        const dateStr = createdAt ? new Date(createdAt).toLocaleDateString() : '';
        console.log(`- [#${id}] ${author} on ${dateStr}: ${body}`);
      }
    },
    'Failed to list PR comments',
    {
      onNotFound: () => {
        if (options.json) {
          console.log('[]');
        }
      },
    },
  );
}
