import { GitcodeClient } from '@gitany/gitcode';

export async function commentsCommand(
  url: string,
  issueNumber: string,
  options: Record<string, string | undefined>,
): Promise<void> {
  const n = Number(issueNumber);
  if (!Number.isFinite(n) || n <= 0) {
    console.error('Invalid issue number');
    process.exit(1);
    return;
  }

  try {
    const client = new GitcodeClient();
    const comments = await client.issue.comments(url, n, {
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
    console.error(err);
    process.exit(1);
  }
}
