/**
 * Issue - Get
 * Endpoint: GET /api/v5/repos/{owner}/{repo}/issues/{number}
 */

import { z } from 'zod';
import { issueSchema } from './list.js';
import { API_BASE } from '../constants.js';

export const issueDetailSchema = issueSchema;

export type IssueDetail = z.infer<typeof issueDetailSchema>;

export function getIssueUrl(owner: string, repo: string, issueNumber: number): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`;
}
