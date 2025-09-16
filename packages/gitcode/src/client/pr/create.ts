import { createPullUrl, type CreatePullBody, type PullRequest } from '../../api/pr';
import { parseGitUrl } from '../../utils';
import type { GitcodeClient } from '../core';

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
  return await client.request(apiUrl, 'POST', { body });
}
