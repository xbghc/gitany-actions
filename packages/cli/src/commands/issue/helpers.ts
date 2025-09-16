import { createLogger } from '@gitany/shared';
import { resolveRepoUrl } from '@gitany/git-lib';

const logger = createLogger('@gitany/cli');

export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

export interface IssueTargetOptions {
  repo?: string;
}

export async function resolveIssueContext(
  issueNumberArg: string,
  urlArg: string | undefined,
  options: IssueTargetOptions = {},
) {
  const issueNumber = Number(issueNumberArg);
  if (!Number.isFinite(issueNumber) || issueNumber <= 0) {
    logger.error('Invalid issue number');
    process.exit(1);
  }

  const repoInput = options.repo ?? urlArg;
  const repoUrl = await resolveRepoUrl(repoInput);
  return { issueNumber, repoUrl };
}

export function formatUserName(user: unknown): string {
  if (!user || typeof user !== 'object') {
    return 'Unknown';
  }
  const record = user as Record<string, unknown>;
  return String(record.name ?? record.login ?? record.username ?? 'Unknown');
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

