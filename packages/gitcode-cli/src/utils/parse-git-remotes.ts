import simpleGit from 'simple-git';

/**
 * Check if a URL belongs to GitCode platform
 * @param url - Git remote URL
 * @returns true if URL is from gitcode.com or gitcode.net
 */
export function isGitCodeUrl(url: string): boolean {
  return /gitcode\.(com|net)/i.test(url);
}

/**
 * Parse git remotes via simple-git
 * @param cwd - Current working directory (defaults to process.cwd())
 * @returns Array of git remotes with name, url, and optional fetch config
 */
export async function parseGitRemotes(
  cwd: string = process.cwd(),
): Promise<Array<{ name: string; url: string; fetch?: string; isGitCode: boolean }>> {
  try {
    const git = simpleGit({ baseDir: cwd });
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return [];
    }

    const remotes = await git.getRemotes(true);
    return remotes.reduce<Array<{ name: string; url: string; fetch?: string; isGitCode: boolean }>>(
      (parsed, remote) => {
        const url = remote.refs.fetch || remote.refs.push;

        if (url) {
          parsed.push({
            name: remote.name,
            url,
            fetch: remote.refs.fetch,
            isGitCode: isGitCodeUrl(url),
          });
        }

        return parsed;
      },
      [],
    );
  } catch {
    // If git commands fail (e.g., not a repo), return empty
    return [];
  }
}
