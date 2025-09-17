/**
 * Create Issue - Client Implementation
 */

import type { GitcodeClient } from '../core';
import type { CreateIssueParams, CreatedIssue } from '../../api/issue/create';
import { createIssueUrl, createdIssueSchema } from '../../api/issue/create';

/**
 * Creates a new issue in a repository.
 * @param client - The GitCode client instance
 * @param params - Create issue parameters
 * @returns Promise resolving to the created issue
 */
export async function createIssue(
  client: GitcodeClient,
  params: CreateIssueParams,
): Promise<CreatedIssue> {
  const url = createIssueUrl(params.owner);
  const response = await client.request(url, 'POST', {
    json: params.body,
  });

  const result = createdIssueSchema.safeParse(response);
  if (!result.success) {
    throw new Error(`Invalid issue response: ${result.error.message}`);
  }

  return result.data;
}
