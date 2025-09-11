import { GitcodeClient, parseGitUrl, type CreatePullBody } from '@gitany/gitcode';

export async function createCommand(
  url: string,
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
        console.error('Invalid --issue number');
        process.exit(1);
        return;
      }
      body.issue = n;
    }

    const client = new GitcodeClient();
    const created = await client.pr.create(url, body);

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
    console.error(err);
    process.exit(1);
  }
}