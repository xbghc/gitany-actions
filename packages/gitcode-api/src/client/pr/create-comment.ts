/**
 * Create PR Comment - Client Implementation
 */

import type { CreatePrCommentParams, CreatedPrComment } from '../../api/pr/create-comment.js';
import { createPrCommentUrl, createdPrCommentSchema } from '../../api/pr/create-comment.js';
import { parseGitUrl } from '../../utils/index.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

/**
 * Creates a new comment on a pull request.
 * @param client - The GitCode client instance
 * @param params - Create PR comment parameters
 * @returns Promise resolving to the created comment
 */
export async function createPrComment(
  client: GitCodeClient,
  params: CreatePrCommentParams,
): Promise<CreatedPrComment> {
  const parsed = parseGitUrl(params.url);
  const owner = parsed?.owner;
  const repo = parsed?.repo;
  if (!owner || !repo) {
    throw new Error(`Invalid repository URL: ${params.url}`);
  }

  const url = createPrCommentUrl(owner, repo, params.number);
  const response = await client.http
    .post(url, {
      json: params.body,
    })
    .json();

  return parseApiResponse(createdPrCommentSchema, response, {
    endpoint: url,
    method: 'POST',
    params: { number: params.number },
  });
}
