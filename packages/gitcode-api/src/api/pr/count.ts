/**
 * Pull Requests - Count
 * Endpoint: GET /api/v5/repos/{owner}/{repo}/pulls?only_count=true
 */

import { z } from 'zod';
import { API_BASE } from '../constants.js';

/**
 * Pull Request count statistics.
 */
export const prCountSchema = z.object({
  all: z.number(),
  opened: z.number(),
  closed: z.number(),
  merged: z.number(),
  locked: z.number(),
});

export type PrCount = z.infer<typeof prCountSchema>;

/**
 * Builds the request URL for getting PR count.
 * Example: /repos/owner/repo/pulls?only_count=true
 */
export function prCountUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
}
