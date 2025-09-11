import { GitcodeAuth, parseGitUrl } from '@gitany/gitcode';

export async function listCommand(url: string, options: any): Promise<void> {
  const auth = new GitcodeAuth();
  
  try {
    const remote = parseGitUrl(url);
    if (!remote) {
      console.error('Unrecognized git URL:', url);
      process.exit(1);
      return;
    }

    const client = await auth.client();
    const pulls = await client.listPullRequests(remote.owner, remote.repo, {
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
    for (const pr of pulls as any[]) {
      const num = (pr?.number ?? pr?.iid ?? pr?.id) as number | string | undefined;
      const title = (pr?.title ?? pr?.subject ?? pr?.name ?? '(no title)') as string;
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
    console.error(err);
    process.exit(1);
  }
}