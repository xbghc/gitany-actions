/**
 * Issues - Update
 * Endpoint: PATCH /api/v5/repos/{owner}/{repo}/issues/{number}
 */

import { z } from 'zod';
import { API_BASE } from '../constants';
import { issueDetailSchema } from './get';

/**
 * Request body for updating an issue.
 */
export interface UpdateIssueBody {
  /** New issue title. */
  title?: string;
  /** New issue body/description. */
  body?: string;
  /** Assign a single user. */
  assignee?: string;
  /** Replace assignees with the provided list. */
  assignees?: string[];
  /** Update milestone by number. */
  milestone?: number;
  /** Replace labels with the provided list. */
  labels?: Array<string | number>;
  /** Update issue state. */
  state?: 'open' | 'closed';
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
