/**
 * Create Issue - Client Implementation
 */

import type { CreateIssueParams, CreatedIssue } from '../../api/issue/create.js';
import { createIssueUrl, createdIssueSchema } from '../../api/issue/create.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

/**
 * Creates a new issue in a repository.
 * @param client - The GitCode client instance
 * @param params - Create issue parameters
 * @returns Promise resolving to the created issue
 */
export async function createIssue(
  client: GitCodeClient,
  params: CreateIssueParams,
): Promise<CreatedIssue> {
  const url = createIssueUrl(params.owner);
  const response = await client.http
    .post(url, {
      json: params.body,
    })
    .json();

  return parseApiResponse(createdIssueSchema, response, { endpoint: url, method: 'POST' });
}
