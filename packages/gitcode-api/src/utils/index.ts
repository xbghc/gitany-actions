import gitUrlParse from 'git-url-parse';

export type Remote = { owner: string; repo: string; host?: string };

/**
 * Parses a Git remote URL like:
 *  - https://github.com/owner/repo(.git)
 *  - git@github.com:owner/repo(.git)
 */
export function parseGitUrl(url: string): Remote | null {
  try {
    const parsed = gitUrlParse(url);
    if (parsed.owner && parsed.name) {
      const host = parsed.port ? `${parsed.resource}:${parsed.port}` : parsed.resource;
      return {
        host,
        owner: parsed.owner,
        repo: parsed.name,
      };
    }
  } catch {
    // ignore
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

/**
 * Builds a query object by dropping undefined values and
 * coercing primitives to be URL-safe. Used for HTTP query params.
 */
export function toQuery<T extends object | undefined | null>(
  input: T,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!input) return out;
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else {
      // Fallback to string representation for other serializable types
      out[k] = String(v);
    }
  }
  return out;
}

export { isObjectLike } from './types.js';
