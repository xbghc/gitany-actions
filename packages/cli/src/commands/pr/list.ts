import { createGitcodeClient, parseGitUrl } from '@gitany/gitcode';

export async function listCommand(
  url: string,
  options: Record<string, string | undefined>,
): Promise<void> {
  try {
    const remote = parseGitUrl(url);
    if (!remote) {
      console.error('Unrecognized git URL:', url);
      process.exit(1);
      return;
    }

    const client = await createGitcodeClient();
    const pulls = await client.pr.list(remote.owner, remote.repo, {
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
    console.error(err);
    process.exit(1);
  }
}