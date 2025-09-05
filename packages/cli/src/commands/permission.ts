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
    console.error('Usage: gitcode permission <git-url>  (e.g., https://gitcode.com/owner/repo.git)');
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
    const result = await client.getSelfRepoPermission(owner, repo);
    const permission = extractPermission(result);
    console.log(permission);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If repository does not exist (404), return 'none' with success exit code
    if (/\b404\b/.test(msg)) {
      console.log('none');
      return;
    }
    console.error(err);
    process.exitCode = 1;
  }
}

export function printPermissionHelp() {
  console.log(
    `Usage: gitcode permission <git-url> [options]\n\nOptions:\n  --url <git-url>    Repository URL (alternative to positional)\n\nDescription:\n  Fetch the current user's permission for the specified repository URL.\n  Prints one of: admin | write | read | none\n  Calls: GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission\n\nExamples:\n  gitcode permission https://gitcode.com/owner/repo.git\n  gitcode permission --url git@gitcode.com:owner/repo.git`
  );
}

function extractPermission(result: unknown): 'admin' | 'write' | 'read' | 'none' {
  // Map strictly by cn_name per requirements:
  // - 管理员 -> admin
  // - 维护者、开发者 -> write
  // - 无 role_info -> read
  if (result && typeof result === 'object') {
    const obj: any = result;
    const role = obj.role_info || obj.roleInfo;
    if (!role) {
      return 'read';
    }
    const cn = typeof role.cn_name === 'string' ? role.cn_name.trim() : '';
    if (cn.includes('管理员')) return 'admin';
    if (cn.includes('维护者') || cn.includes('开发者')) return 'write';
    // Any other cn_name (if appears) treat as read per guidance
    return 'read';
  }
  // If shape unexpected, default to read
  return 'read';
}
