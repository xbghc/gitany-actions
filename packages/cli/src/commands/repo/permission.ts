import { GitcodeAuth, parseGitUrl } from '@gitany/gitcode';

function parseFlag(args: string[], name: string): string | null {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  const eq = args.find((a) => a.startsWith(name + '='));
  if (eq) return eq.split('=', 2)[1];
  return null;
}

// no flags for output modes — always return a single word

export async function permissionCommand(args: string[]): Promise<void> {
  // Accept repository URL as the first positional argument (or via --url)
  const urlArg = args[0] && !args[0].startsWith('--') ? args[0] : parseFlag(args, '--url');
  if (!urlArg) {
    console.error('Usage: gitcode repo permission <git-url>  (e.g., https://gitcode.com/owner/repo.git)');
    process.exitCode = 1;
    return;
  }

  const remote = parseGitUrl(urlArg);
  if (!remote) {
    console.error('Unrecognized git URL:', urlArg);
    process.exitCode = 1;
    return;
  }

  const { owner, repo } = remote;

  const auth = new GitcodeAuth();
  const client = await auth.client();
  try {
    const permission = await client.getSelfRepoPermissionRole(owner, repo);
    console.log(permission);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

export function printPermissionHelp() {
  console.log(
    `Usage: gitcode repo permission <git-url> [options]\n\nOptions:\n  --url <git-url>    Repository URL (alternative to positional)\n\nDescription:\n  Fetch the current user's permission for the specified repository URL.\n  Prints one of: admin | write | read | none\n  Calls: GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission\n\nExamples:\n  gitcode repo permission https://gitcode.com/owner/repo.git\n  gitcode repo permission --url git@gitcode.com:owner/repo.git`
  );
}
