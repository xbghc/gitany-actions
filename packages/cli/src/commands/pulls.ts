import { GitcodeAuth, parseGitUrl } from '@gitany/gitcode';

function parseFlag(args: string[], name: string): string | null {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  const eq = args.find((a) => a.startsWith(name + '='));
  if (eq) return eq.split('=', 2)[1];
  return null;
}

export async function pullsCommand(args: string[]): Promise<void> {
  // Accept repository URL as positional or via --url
  const urlArg = args[0] && !args[0].startsWith('--') ? args[0] : parseFlag(args, '--url');
  if (!urlArg) {
    console.error('Usage: gitcode pulls <git-url> [--state open|closed|all]');
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
    console.log(JSON.stringify(pulls, null, 2));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/\b404\b/.test(msg)) {
      console.log('[]');
      return;
    }
    console.error(err);
    process.exitCode = 1;
  }
}

export function printPullsHelp() {
  console.log(
    `Usage: gitcode pulls <git-url> [options]\n\nOptions:\n  --url <git-url>        Repository URL (alternative to positional)\n  --state <state>        Filter by state: open | closed | all (default: open)\n  --head <ref>           Filter by head (branch or repo:branch)\n  --base <branch>        Filter by base branch\n  --sort <field>         Optional sort field if supported\n  --direction <dir>      asc | desc\n\nDescription:\n  List pull requests for the specified repository URL.\n  Calls: GET /api/v5/repos/{owner}/{repo}/pulls\n\nExamples:\n  gitcode pulls https://gitcode.com/owner/repo.git\n  gitcode pulls --url git@gitcode.com:owner/repo.git --state open`
  );
}
