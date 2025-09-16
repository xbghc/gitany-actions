/**
 * Create PR Comment - Client Implementation
 */

import type { GitcodeClient } from '../core';
import type {
  CreatePrCommentParams,
  CreatedPrComment,
} from '../../api/pr/create-comment';
import { createPrCommentUrl, createdPrCommentSchema } from '../../api/pr/create-comment';

/**
 * Creates a new comment on a pull request.
 * @param client - The GitCode client instance
 * @param params - Create PR comment parameters
 * @returns Promise resolving to the created comment
 */
export async function createPrComment(
  client: GitcodeClient,
  params: CreatePrCommentParams,
): Promise<CreatedPrComment> {
  const url = createPrCommentUrl(params.owner, params.repo, params.number);
  const response = await client.request(url, 'POST', {
    body: JSON.stringify(params.body),
  });

  const result = createdPrCommentSchema.safeParse(response);
  if (!result.success) {
    throw new Error(`Invalid PR comment response: ${result.error.message}`);
  }

  return result.data;
}