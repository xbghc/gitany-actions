/**
 * Pull Requests API
 *
 * Endpoint: GET /api/v5/repos/{owner}/{repo}/pulls
 * Returns a list of pull requests for a repository.
 */

/**
 * Query parameters for listing pull requests.
 * Only include fields you need; extra fields are ignored.
 */
export type ListPullsQuery = {
  /** Filter by state, e.g., 'open' | 'closed' | 'all' */
  state?: string;
  /** Page index, starting from 1. */
  page?: number;
  /** Items per page. */
  per_page?: number;
  /** Optional sort field if supported by the API. */
  sort?: string;
  /** Optional sort direction, e.g., 'asc' | 'desc'. */
  direction?: string;
  /** Filter by head branch or repo:branch. */
  head?: string;
  /** Filter by base branch. */
  base?: string;
  [k: string]: unknown;
};

/**
 * Path params for list pulls request.
 */
export type ListPullsParams = {
  /** Repository owner (user or organization). */
  owner: string;
  /** Repository name (without .git). */
  repo: string;
  /** Optional query parameters. */
  query?: ListPullsQuery;
};

/**
 * Minimal Pull Request representation with common fields.
 * Additional fields may be present and are preserved via index signature.
 */
export type PullRequest = {
  id: number;
  number?: number;
  title?: string;
  state?: string;
  user?: unknown;
  head?: unknown;
  base?: unknown;
  created_at?: string;
  updated_at?: string;
  merged_at?: string | null;
  [k: string]: unknown;
};

export type ListPullsResponse = PullRequest[];

/**
 * Builds the request path for listing pull requests.
 * Example: /repos/owner/repo/pulls?state=open&page=1&per_page=20
 */
export function listPullsPath(params: ListPullsParams): string {
  const { owner, repo, query } = params;
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
  if (!query) return base;
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    usp.append(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

