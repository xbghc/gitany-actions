import type { PRComment, PRCommentQueryOptions } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';

const logger = createLogger('@xbghc/gitcode-cli');

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
      const comments: PRComment[] = await client.pr.comments(repoUrl, n, {
        page: options.page ? Number(options.page) : undefined,
        per_page: options.perPage ? Number(options.perPage) : undefined,
        comment_type: isPrCommentType(options.commentType) ? options.commentType : undefined,
      });

      if (options.json) {
        console.log(JSON.stringify(comments, null, 2));
        return;
      }

      for (const comment of comments) {
        const id = comment.id;
        const bodyFirstLine = comment.body.split('\n')[0] ?? '';
        const author = comment.user?.id ?? '?';
        console.log(`- [#${id}] ${author}: ${bodyFirstLine}`);
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
