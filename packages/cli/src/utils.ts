import { GitClient } from '@gitany/git-lib';

export async function resolveRepoUrl(url?: string): Promise<string> {
  if (url) return url;
  const git = new GitClient();
  const result = await git.run(['remote', 'get-url', 'origin']);
  if (!result || result.code !== 0) {
    throw new Error('Failed to detect repository URL from git remote "origin"');
  }
  return result.stdout.trim();
}
