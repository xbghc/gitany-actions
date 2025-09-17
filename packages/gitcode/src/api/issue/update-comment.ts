import { z } from 'zod';
import { userSchema } from '../../types/user';

// Note: The actual response for an updated comment is not documented.
// This schema is a reasonable assumption based on the 'create' response.
export const updatedIssueCommentSchema = z.object({
  id: z.number(),
  body: z.string(),
  user: userSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type UpdatedIssueComment = z.infer<typeof updatedIssueCommentSchema>;

export interface UpdateIssueCommentParams {
  owner: string;
  repo: string;
  comment_id: number;
  body: {
    body: string;
  };
}

export function updateIssueCommentUrl(
  owner: string,
  repo: string,
  commentId: number,
): string {
  return `/repos/${owner}/${repo}/issues/comments/${commentId}`;
}
