import { listPullsUrl, type ListPullsQuery, type ListPullsResponse } from '../../api/pr';
import type { GitcodeClient } from '../core';

export async function listPullRequests(
  client: GitcodeClient,
  owner: string,
  repo: string,
  prQuery: ListPullsQuery = { state: 'open' },
): Promise<ListPullsResponse> {
  const path = listPullsUrl(owner, repo);
  const query: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(prQuery)) {
    if (v !== undefined) {
      query[k] = v;
    }
  }
  return await client.request(path, 'GET', { query });
}
