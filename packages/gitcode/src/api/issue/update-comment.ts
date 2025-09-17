import { z } from 'zod';

// Note: The actual response for an updated comment is not documented.
// This schema is a reasonable assumption based on the 'create' response.
export const updatedIssueCommentSchema = z.any(); // 返回空值，忽略结果

export type UpdatedIssueComment = z.infer<typeof updatedIssueCommentSchema>;

export interface UpdateIssueCommentParams {
  owner: string;
  repo: string;
  comment_id: number;
  body: {
    body: string;
  };
}

import { API_BASE } from '../constants';

export function updateIssueCommentUrl(owner: string, repo: string, commentId: number): string {
  return `${API_BASE}/repos/${owner}/${repo}/issues/comments/${commentId}`;
}
