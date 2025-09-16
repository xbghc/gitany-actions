/**
 * PR Comments - Create
 * Endpoint: POST /api/v5/repos/{owner}/{repo}/pulls/{number}/comments
 */

import { z } from 'zod';
import { API_BASE } from '../constants';

/**
 * Request body for creating a PR comment.
 */
export interface CreatePrCommentBody {
  /** Comment content. */
  body: string;
  // TODO 还允许接收其它字段：path, position, need_to_resolve
}

/**
 * Path params for create PR comment request.
 */
export type CreatePrCommentParams = {
  /** Repository owner (user or organization). */
  owner: string;
  /** Repository name (without .git). */
  repo: string;
  /** PR number. */
  number: number;
  /** Comment data. */
  body: CreatePrCommentBody;
};

/**
 * Complete PR Comment representation with all fields.
 */
export const createdPrCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
});

export type CreatedPrComment = z.infer<typeof createdPrCommentSchema>;

/**
 * Builds the request path for creating a PR comment.
 */
export function createPrCommentUrl(owner: string, repo: string, prNumber: number): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/pulls/${prNumber}/comments`;
}
