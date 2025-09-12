export type Remote = { owner: string; repo: string; host?: string; };
/**
 * Parses a Git remote URL like:
 *  - https://github.com/owner/repo(.git)
 *  - git@github.com:owner/repo(.git)
 */

export function parseGitUrl(url: string): Remote | null {
  // Simple, safe parsing — returns null on unknown shapes.
  const https = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (https) {
    return { host: https[1], owner: https[2], repo: https[3] };
  }

  const ssh = url.match(/^git@([^:]+):([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (ssh) {
    return { host: ssh[1], owner: ssh[2], repo: ssh[3] };
  }

  return null;
}

/**
 * Ensures a repository URL ends with `.git` (idempotent).
 * Accepts any URL-like string and appends the suffix only when missing.
 */
export function toGitUrl(url: string): string {
  return url.endsWith('.git') ? url : `${url}.git`;
}
