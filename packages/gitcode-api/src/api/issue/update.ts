/**
 * Issues - Update
 * Endpoint: PATCH /api/v5/repos/{owner}/{repo}/issues/{number}
 */

import { z } from 'zod';
import { API_BASE } from '../constants.js';
import { issueDetailSchema } from './get.js';

/**
 * Request body for updating an issue.
 *
 * ⚠️ Note: GitCode API has asymmetric design:
 * - Request uses 'assignee' (singular, comma-separated string)
 * - Response returns 'assignees' (plural, array of user objects)
 */
export interface UpdateIssueBody {
  /** New issue title. */
  title?: string;
  /** New issue body/description. */
  body?: string;
  /**
   * Replace assignees with the provided username(s).
   * Can be a single username or multiple usernames separated by commas (e.g., "user1,user2,user3").
   */
  assignee?: string;
  /** Update milestone by number. */
  milestone?: number;
  /** Replace labels with the provided list. */
  labels?: Array<string | number>;
  /**
   * Update issue state.
   * - 'close': Close the issue
   * - 'reopen': Reopen the issue
   *
   * ⚠️ Note: GitCode uses 'close'/'reopen' (not 'closed'/'open')
   */
  state?: 'close' | 'reopen';
}

/**
 * Path params for update issue request.
 */
export interface UpdateIssueParams {
  owner: string;
  repo: string;
  issueNumber: number;
  body: UpdateIssueBody;
}

export const updatedIssueSchema = issueDetailSchema;

export type UpdatedIssue = z.infer<typeof updatedIssueSchema>;

/**
 * Builds the request path for updating an issue.
 */
export function updateIssueUrl(owner: string, repo: string, issueNumber: number): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`;
}
