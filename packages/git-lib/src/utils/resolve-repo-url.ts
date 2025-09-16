import { GitClient } from '../client';
import { GitNotFoundError } from '../errors';

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

export async function resolveRepoUrl(
  url?: string,
  options: { cwd?: string } = {},
): Promise<string> {
  if (url) return normalizeRepoUrlInput(url);
  const client = new GitClient(options.cwd);
  try {
    const result = await client.run(['remote', 'get-url', 'origin']);
    if (result.code !== 0) {
      throw new Error(
        result.stderr.trim() ||
          'Failed to get remote URL. Provide repository URL or run inside a git repo.',
      );
    }
    return result.stdout.trim();
  } catch (err) {
    if (err instanceof GitNotFoundError) {
      throw new GitNotFoundError('git not found. Provide repository URL or install git.');
    }
    throw err;
  }
}
