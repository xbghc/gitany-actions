/**
 * Pull Request - Get
 * Endpoint: GET /api/v5/repos/{owner}/{repo}/pulls/{number}
 */

import { z } from 'zod';
import { API_BASE } from '../constants.js';
import { pullRequestSchema } from './list.js';

export const pullRequestDetailSchema = pullRequestSchema;

export type PullRequestDetail = z.infer<typeof pullRequestDetailSchema>;

export function getPullRequestUrl(owner: string, repo: string, prNumber: number): string {
  return `${API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`;
}
