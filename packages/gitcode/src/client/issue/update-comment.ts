/**
 * Update Issue Comment - Client Implementation
 */

import type { GitcodeClient } from '../core';
import type { UpdateIssueCommentParams, UpdatedIssueComment } from '../../api/issue/update-comment';
import { updateIssueCommentUrl, updatedIssueCommentSchema } from '../../api/issue/update-comment';

/**
 * Updates an existing comment on an issue.
 * @param client - The GitCode client instance
 * @param params - Update issue comment parameters
 * @returns Promise resolving to the updated comment
 */
export async function updateIssueComment(
  client: GitcodeClient,
  params: UpdateIssueCommentParams,
): Promise<UpdatedIssueComment> {
  const url = updateIssueCommentUrl(params.owner, params.repo, params.comment_id);
  const response = await client.request(url, 'PATCH', {
    json: params.body,
  });

  const result = updatedIssueCommentSchema.safeParse(response);
  if (!result.success) {
    throw new Error(`Invalid updated issue comment response: ${result.error.message}`);
  }

  return result.data;
}
