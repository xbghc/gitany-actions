/**
 * Create Issue Comment - Client Implementation
 */

import type { GitcodeClient } from '../core';
import type {
  CreateIssueCommentParams,
  CreatedIssueComment,
} from '../../api/issue/create-comment';
import { createIssueCommentUrl, createdIssueCommentSchema } from '../../api/issue/create-comment';

/**
 * Creates a new comment on an issue.
 * @param client - The GitCode client instance
 * @param params - Create issue comment parameters
 * @returns Promise resolving to the created comment
 */
export async function createIssueComment(
  client: GitcodeClient,
  params: CreateIssueCommentParams,
): Promise<CreatedIssueComment> {
  const url = createIssueCommentUrl(params.owner, params.repo, params.number);
  const response = await client.request(url, 'POST', {
    body: params.body,
  });

  const result = createdIssueCommentSchema.safeParse(response);
  if (!result.success) {
    throw new Error(`Invalid issue comment response: ${result.error.message}`);
  }

  return result.data;
}
