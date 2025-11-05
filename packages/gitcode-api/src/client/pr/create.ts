import { createPullUrl, pullRequestSchema, type CreatePullBody, type PullRequest } from '../../api/pr/index.js';
import { parseGitUrl } from '../../utils/index.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

export async function createPullRequest(
  client: GitCodeClient,
  url: string,
  body: CreatePullBody,
): Promise<PullRequest> {
  const { owner, repo } = parseGitUrl(url) || {};
  if (!owner || !repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = createPullUrl(owner, repo);
  const response = await client.http.post(apiUrl, { json: body }).json();
  return parseApiResponse(pullRequestSchema, response, {
    endpoint: apiUrl,
    method: 'POST',
    params: body,
  });
}
