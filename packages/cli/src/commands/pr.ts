import { printPullsHelp } from './pulls';
import { GitcodeAuth, parseGitUrl } from '@gitany/gitcode';

function parseFlag(args: string[], name: string): string | null {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  const eq = args.find((a) => a.startsWith(name + '='));
  if (eq) return eq.split('=', 2)[1];
  return null;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export async function prCommand(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'list': {
      const rest = args.slice(1);
      if (!rest.length) {
        // Show help for list
        printPrListHelp();
        return;
      }
      await prList(rest);
      return;
    }
    default: {
      printPrHelp();
    }
  }
}

async function prList(args: string[]): Promise<void> {
  const urlArg = args[0] && !args[0].startsWith('--') ? args[0] : parseFlag(args, '--url');
  if (!urlArg) {
    printPrListHelp();
    process.exitCode = 1;
    return;
  }

  const remote = parseGitUrl(urlArg);
  if (!remote) {
    console.error('Unrecognized git URL:', urlArg);
    process.exitCode = 1;
    return;
  }

  const state = parseFlag(args, '--state') ?? 'open';
  const head = parseFlag(args, '--head') ?? undefined;
  const base = parseFlag(args, '--base') ?? undefined;
  const sort = parseFlag(args, '--sort') ?? undefined;
  const direction = parseFlag(args, '--direction') ?? undefined;
  const asJson = hasFlag(args, '--json');

  const auth = new GitcodeAuth();
  const client = await auth.client();

  try {
    const pulls = await client.listPullRequests(remote.owner, remote.repo, {
      state,
      head,
      base,
      sort,
      direction,
    });
    if (asJson) {
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
      if (asJson) {
        console.log('[]');
      }
      // otherwise print nothing on 404
      return;
    }
    console.error(err);
    process.exitCode = 1;
  }
}

export function printPrHelp() {
  console.log(
    `Usage: gitcode pr <command> [options]\n\nCommands:\n  list    List pull requests for a repository\n\nExamples:\n  gitcode pr list https://gitcode.com/owner/repo.git\n  gitcode pr list --url git@gitcode.com:owner/repo.git --state open`
  );
}

function printPrListHelp() {
  console.log(
    `Usage: gitcode pr list <git-url> [options]\n\nOptions:\n  --url <git-url>        Repository URL (alternative to positional)\n  --state <state>        Filter by state: open | closed | all (default: open)\n  --head <ref>           Filter by head (branch or repo:branch)\n  --base <branch>        Filter by base branch\n  --sort <field>         Optional sort field if supported\n  --direction <dir>      asc | desc\n  --json                 Output raw JSON instead of list\n\nDescription:\n  Default output is a title list in the form (default filters: state=open):\n    - [#123] Fix bug\n    - [#122] Add feature\n  Calls: GET /api/v5/repos/{owner}/{repo}/pulls`
  );
}
