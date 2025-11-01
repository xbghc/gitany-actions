import fs from 'node:fs';
import path from 'node:path';

/**
 * Parse .git/config file and extract remote origin URL
 */
function resolveGitDir(cwd: string): string {
  const gitPath = path.join(cwd, '.git');

  if (!fs.existsSync(gitPath)) {
    throw new Error('Not a git repository (or any of the parent directories)');
  }

  const stat = fs.lstatSync(gitPath);
  if (stat.isDirectory()) {
    return gitPath;
  }

  if (stat.isSymbolicLink()) {
    return fs.realpathSync(gitPath);
  }

  if (stat.isFile()) {
    const content = fs.readFileSync(gitPath, 'utf-8');
    const match = content.match(/^gitdir:\s*(.+)$/m);
    if (!match) {
      throw new Error('Invalid gitdir reference in .git file');
    }

    const gitDirPath = match[1].trim();
    return path.isAbsolute(gitDirPath) ? gitDirPath : path.resolve(cwd, gitDirPath);
  }

  throw new Error('Unsupported .git entry');
}

function parseGitConfig(cwd: string = process.cwd()): string {
  const gitDir = resolveGitDir(cwd);
  const gitConfigPath = path.join(gitDir, 'config');

  if (!fs.existsSync(gitConfigPath)) {
    throw new Error(
      'Not a git repository (or any of the parent directories): .git/config not found',
    );
  }

  const content = fs.readFileSync(gitConfigPath, 'utf-8');
  const lines = content.split('\n');

  let inRemoteOrigin = false;
  for (const line of lines) {
    const trimmed = line.trim();

    // Check for [remote "origin"] section
    if (trimmed === '[remote "origin"]' || trimmed === "[remote 'origin']") {
      inRemoteOrigin = true;
      continue;
    }

    // Exit remote origin section if we hit another section
    if (trimmed.startsWith('[') && inRemoteOrigin) {
      break;
    }

    // Extract url from remote origin section
    if (inRemoteOrigin && trimmed.startsWith('url')) {
      const match = trimmed.match(/url\s*=\s*(.+)/);
      if (match) {
        return match[1].trim();
      }
    }
  }

  throw new Error('No remote origin URL found in git config');
}

/**
 * Normalize repository URL input
 */
function normalizeRepoUrlInput(raw: string): string {
  const url = raw.trim();
  if (!url) {
    throw new Error('Repository URL cannot be empty');
  }

  // Already an absolute HTTP/HTTPS/SSH URL (e.g., https://, git@)
  if (/^(?:https?:\/\/|git@)/i.test(url)) {
    return url;
  }

  // OWNER/REPO
  const ownerRepo = url.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (ownerRepo) {
    const [, owner, repo] = ownerRepo;
    return `https://gitcode.com/${owner}/${repo}`;
  }

  // HOST/OWNER/REPO (no scheme provided)
  const hostOwnerRepo = url.match(/^([\w.-]+)\/([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (hostOwnerRepo) {
    const [, host, owner, repo] = hostOwnerRepo;
    return `https://${host}/${owner}/${repo}`;
  }

  return url;
}

/**
 * Resolve repository URL
 * - If url is provided, normalize and return it
 * - Otherwise, read from .git/config in cwd
 */
export async function resolveRepoUrl(
  url?: string,
  options: { cwd?: string } = {},
): Promise<string> {
  if (url) {
    return normalizeRepoUrlInput(url);
  }

  const cwd = options.cwd || process.cwd();
  return parseGitConfig(cwd);
}
