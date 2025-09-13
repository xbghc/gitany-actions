/**
 * Issues - List
 * Endpoint: GET /api/v5/repos/{owner}/{repo}/issues
 */

import { z } from 'zod';
import { API_BASE } from '../constants';

/**
 * Query parameters for listing issues.
 * Only include fields you need; extra fields are ignored.
 */
export interface ListIssuesQuery {
  /** Filter by state: open | closed | all */
  state?: 'open' | 'closed' | 'all';
  /** Filter by labels (comma-separated). */
  labels?: string;
  /** Page index, starting from 1. */
  page?: number;
  /** Items per page. */
  per_page?: number;
}

/**
 * Path params for list issues request.
 */
export type ListIssuesParams = {
  /** Repository owner (user or organization). */
  owner: string;
  /** Repository name (without .git). */
  repo: string;
  /** Optional query parameters. */
  query?: ListIssuesQuery;
};

/**
 * Minimal Issue representation with common fields.
 */
export const issueSchema = z.object({
  id: z.number(),
  html_url: z.string(),
  number: z.number(),
  state: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  user: z.unknown().optional(),
});

export type Issue = z.infer<typeof issueSchema>;

export const listIssuesResponseSchema = issueSchema.array();

export type ListIssuesResponse = Issue[];

/**
 * Builds the request path for listing issues.
 * Example: /repos/owner/repo/issues?state=open&page=1&per_page=20
 */
export function listIssuesUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;
}
