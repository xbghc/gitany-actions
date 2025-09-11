import { GitcodeAuth, parseGitUrl } from '@gitany/gitcode';

export async function createCommand(url: string, options: any): Promise<void> {
  const auth = new GitcodeAuth();
  
  try {
    const remote = parseGitUrl(url);
    if (!remote) {
      console.error('Unrecognized git URL:', url);
      process.exit(1);
      return;
    }

    const body: any = {
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

    const client = await auth.client();
    const created = await client.createPullRequest(remote.owner, remote.repo, body);

    if (options.json) {
      console.log(JSON.stringify(created, null, 2));
      return;
    }

    const pr: any = created;
    const num = (pr?.number ?? pr?.iid ?? pr?.id) as number | string | undefined;
    const titleOut = (pr?.title ?? '(no title)') as string;
    const numStr = typeof num === 'number' ? num : (num ?? '?');
    console.log(`Created PR #${numStr}: ${titleOut}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}