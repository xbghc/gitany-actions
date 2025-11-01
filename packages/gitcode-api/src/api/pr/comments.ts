import { z } from 'zod';
import { API_BASE } from '../constants.js';
import { userSummarySchema } from '../user/summary.js';

export interface PRCommentQueryOptions {
  comment_type?: 'diff_comment' | 'pr_comment';
  page?: number;
  per_page?: number;
}

export const prCommentSchema = z.object({
  id: z.number(),
  body: z.string(),
  user: userSummarySchema,
  created_at: z.string(),
  updated_at: z.string(),
  // 省略部分内容
});

export type PRComment = z.infer<typeof prCommentSchema>;

export function prCommentsUrl(owner: string, repo: string, prNumber: number) {
  return `${API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
}
