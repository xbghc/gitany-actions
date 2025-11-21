import { simpleGit } from 'simple-git';

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
  try {
    const git = simpleGit({ baseDir: cwd });
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository (or any of the parent directories)');
    }

    const remotes = await git.getRemotes(true);
    const origin = remotes.find((remote) => remote.name === 'origin');
    const originUrl = origin?.refs.fetch || origin?.refs.push;

    if (!originUrl) {
      throw new Error('No remote origin URL found in git config');
    }

    return originUrl;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to resolve repository URL');
  }
}
