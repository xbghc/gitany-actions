/**
 * Issue Comments - Create
 * Endpoint: POST /api/v5/repos/{owner}/{repo}/issues/{number}/comments
 */

import { z } from 'zod';
import { API_BASE } from '../constants';

/**
 * Request body for creating an issue comment.
 */
export interface CreateIssueCommentBody {
  /** Comment content. */
  body: string;
}

/**
 * Path params for create issue comment request.
 */
export type CreateIssueCommentParams = {
  /** Repository owner (user or organization). */
  owner: string;
  /** Repository name (without .git). */
  repo: string;
  /** Issue number. */
  number: number;
  /** Comment data. */
  body: CreateIssueCommentBody;
};

/**
 * Complete Issue Comment representation with all fields.
 */
export const createdIssueCommentSchema = z.object({
  id: z.number(),
  body: z.string(),
});

export type CreatedIssueComment = z.infer<typeof createdIssueCommentSchema>;

/**
 * Builds the request path for creating an issue comment.
 */
export function createIssueCommentUrl(owner: string, repo: string, issueNumber: number): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/issues/${issueNumber}/comments`;
}
