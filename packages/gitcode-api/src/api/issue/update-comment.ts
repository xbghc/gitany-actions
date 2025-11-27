import { z } from 'zod';

// API 可能返回空字符串或 null
export const updatedIssueCommentSchema = z.union([z.null(), z.literal('')]);

export type UpdatedIssueComment = z.infer<typeof updatedIssueCommentSchema>;

export interface UpdateIssueCommentParams {
  owner: string;
  repo: string;
  id: number;
  body: {
    body: string;
  };
}

import { API_BASE } from '../constants.js';

export function updateIssueCommentUrl(owner: string, repo: string, commentId: number): string {
  return `${API_BASE}/repos/${owner}/${repo}/issues/comments/${commentId}`;
}
