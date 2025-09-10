/**
 * Pull Requests - Create
 * Endpoint: POST /api/v5/repos/{owner}/{repo}/pulls
 */

/**
 * Create Pull Request body (subset).
 * Only the supported fields are included: title, head, base, issue.
 */
export type CreatePullBody = {
  /** Title of the pull request. Required when not using issue. */
  title?: string;
  /** Source branch name (no cross-repo support here). */
  head?: string;
  /** Target branch name (e.g., main). */
  base?: string;
  /** Create PR from an existing issue number. */
  issue?: number;
  /** Body/description text for the pull request. */
  body?: string;
};

/**
 * Path for creating pull requests — same as listing.
 */
export function createPullPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
}

