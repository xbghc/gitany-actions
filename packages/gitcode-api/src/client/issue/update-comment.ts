/**
 * Update Issue Comment - Client Implementation
 */

import type {
  UpdateIssueCommentParams,
  UpdatedIssueComment,
} from '../../api/issue/update-comment.js';
import {
  updateIssueCommentUrl,
  updatedIssueCommentSchema,
} from '../../api/issue/update-comment.js';
import type { GitCodeClient } from '../core.js';

/**
 * Updates an existing comment on an issue.
 * @param client - The GitCode client instance
 * @param params - Update issue comment parameters
 * @returns Promise resolving to the updated comment
 */
export async function updateIssueComment(
  client: GitCodeClient,
  params: UpdateIssueCommentParams,
): Promise<UpdatedIssueComment> {
  const url = updateIssueCommentUrl(params.owner, params.repo, params.comment_id);
  const response = await client.http
    .patch(url, {
      json: params.body,
    })
    .json();

  const result = updatedIssueCommentSchema.safeParse(response);
  if (!result.success) {
    throw new Error(`Invalid updated issue comment response: ${result.error.message}`);
  }

  return result.data;
}
