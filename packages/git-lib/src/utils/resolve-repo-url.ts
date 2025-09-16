import { GitClient } from '../client';
import { GitNotFoundError } from '../errors';

export async function resolveRepoUrl(
  url?: string,
  options: { cwd?: string } = {},
): Promise<string> {
  if (url) return url;
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
