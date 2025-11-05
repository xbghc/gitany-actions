import {
  listPullsResponseSchema,
  listPullsUrl,
  type ListPullsQuery,
  type ListPullsResponse,
} from '../../api/pr/index.js';
import { parseGitUrl } from '../../utils/index.js';
import type { GitCodeClient } from '../core.js';

export async function listPullRequests(
  client: GitCodeClient,
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
  const json = await client.http.get(apiUrl, { searchParams: query }).json();
  return listPullsResponseSchema.parse(json);
}
