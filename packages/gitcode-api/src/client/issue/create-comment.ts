/**
 * Create Issue Comment - Client Implementation
 */

import type {
  CreateIssueCommentParams,
  CreatedIssueComment,
} from '../../api/issue/create-comment.js';
import {
  createIssueCommentUrl,
  createdIssueCommentSchema,
} from '../../api/issue/create-comment.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

/**
 * Creates a new comment on an issue.
 * @param client - The GitCode client instance
 * @param params - Create issue comment parameters
 * @returns Promise resolving to the created comment
 */
export async function createIssueComment(
  client: GitCodeClient,
  params: CreateIssueCommentParams,
): Promise<CreatedIssueComment> {
  const url = createIssueCommentUrl(params.owner, params.repo, params.number);
  const response = await client.http
    .post(url, {
      json: params.body,
    })
    .json();

  return parseApiResponse(createdIssueCommentSchema, response, { endpoint: url, method: 'POST' });
}
