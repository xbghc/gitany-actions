/**
 * Issue Comments - List
 * Endpoint: GET /api/v5/repos/{owner}/{repo}/issues/{number}/comments
 */

import { z } from 'zod';
import { API_BASE } from '../constants';
import { userSummarySchema } from '../user/summary';

/** Query parameters for listing issue comments. */
export interface IssueCommentsQuery {
  /** Page index, starting from 1. */
  page?: number;
  /** Items per page. */
  per_page?: number;
}

/** Minimal Issue Comment representation. */
export const issueCommentSchema = z.object({
  id: z.number(),
  comment_id: z.number().optional(),
  body: z.string(),
  user: userSummarySchema.optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type IssueComment = z.infer<typeof issueCommentSchema>;

export const issueCommentsResponseSchema = issueCommentSchema.array();

export type IssueCommentsResponse = IssueComment[];

/** Builds the request path for listing issue comments. */
export function issueCommentsUrl(owner: string, repo: string, issueNumber: number): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/issues/${issueNumber}/comments`;
}
