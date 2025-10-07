import { resolveRepoUrl } from '@gitany/git-lib';
import { isObjectLike, parseGitUrl, type IssueUser } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@xbghc/gitcode-cli');

export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

export async function resolveIssueContext(
  issueNumberArg: string,
  urlArg: string | undefined,
): Promise<{ issueNumber: number; repoUrl: string; owner: string; repo: string }> {
  const issueNumber = Number(issueNumberArg);
  if (!Number.isFinite(issueNumber) || issueNumber <= 0) {
    logger.error('Invalid issue number');
    process.exit(1);
  }

  const resolved = await resolveRepoUrl(urlArg);
  let owner = resolved.owner;
  let repo = resolved.repo;

  if (!owner || !repo) {
    const parsed = parseGitUrl(resolved.repoUrl);
    if (!parsed) {
      logger.error('Unrecognized repository URL. Provide OWNER/REPO or a full git URL.');
      process.exit(1);
    }
    owner = parsed.owner;
    repo = parsed.repo;
  }

  return { issueNumber, repoUrl: resolved.repoUrl, owner, repo };
}

export function formatUserName(user: unknown): string {
  if (!isObjectLike(user)) {
    return 'Unknown';
  }
  const tryKeys = ['name', 'login', 'username'] as const;
  for (const key of tryKeys) {
    const val = Reflect.get(user, key);
    if (typeof val === 'string' && val.trim()) return val;
  }
  return 'Unknown';
}

export function formatAssignees(users: IssueUser[]): string | undefined {
  if (users.length === 0) return undefined;
  const names = users.map((u) => formatUserName(u)).filter(Boolean);
  if (names.length === 0) return undefined;
  return names.join(', ');
}

export function colorizeState(state: string): string {
  const normalized = state.toLowerCase();
  if (normalized === 'open') {
    return `${colors.green}${state}${colors.reset}`;
  }
  if (normalized === 'closed') {
    return `${colors.red}${state}${colors.reset}`;
  }
  return `${colors.yellow}${state}${colors.reset}`;
}
