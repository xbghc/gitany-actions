/**
 * Pull Requests - List
 * Endpoint: GET /api/v5/repos/{owner}/{repo}/pulls
 */

/**
 * Query parameters for listing pull requests.
 * Only include fields you need; extra fields are ignored.
 */
export interface ListPullsQuery {
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
}

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
import type { Branch } from '../branch';

export type PullRequest = {
  id: number;
  number: number;
  title: string;
  state: string;
  head: Branch;
  base: Branch;
  user?: unknown;
  created_at?: string;
  updated_at?: string;
  merged_at?: string | null;
  [k: string]: unknown;
};

export type ListPullsResponse = PullRequest[];
import { API_BASE } from '../constants';

/**
 * Builds the request path for listing pull requests.
 * Example: /repos/owner/repo/pulls?state=open&page=1&per_page=20
 */
export function listPullsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
}
