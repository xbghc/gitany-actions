import { createPullUrl, type CreatePullBody, type PullRequest } from '../../api/pr/index.js';
import { parseGitUrl } from '../../utils/index.js';
import type { GitcodeClient } from '../core.js';

export async function createPullRequest(
  client: GitcodeClient,
  url: string,
  body: CreatePullBody,
): Promise<PullRequest> {
  const { owner, repo } = parseGitUrl(url) || {};
  if (!owner || !repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = createPullUrl(owner, repo);
  return await client.request(apiUrl, 'POST', { json: body });
}
