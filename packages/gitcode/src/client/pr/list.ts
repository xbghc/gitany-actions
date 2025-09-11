import { listPullsUrl, type ListPullsQuery, type ListPullsResponse } from '../../api/pr';
import type { GitcodeClient } from '../core';
import { parseGitUrl } from '../../utils';

export async function listPullRequests(
  client: GitcodeClient,
  url: string,
  prQuery: ListPullsQuery = { state: 'open' },
): Promise<ListPullsResponse> {
  const { owner, repo } = parseGitUrl(url) || {};
  if (!owner || !repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = listPullsUrl(owner, repo);
  const query: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(prQuery)) {
    if (v !== undefined) {
      query[k] = v;
    }
  }
  return await client.request(apiUrl, 'GET', { query });
}
