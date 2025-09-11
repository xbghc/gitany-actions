import { createPullUrl, type CreatePullBody, type PullRequest } from '../../api/pr';
import type { GitcodeClient } from '../core';

export async function createPullRequest(
  client: GitcodeClient,
  owner: string,
  repo: string,
  body: CreatePullBody,
): Promise<PullRequest> {
  const url = createPullUrl(owner, repo);
  return await client.request(url, 'POST', { body: JSON.stringify(body) });
}
