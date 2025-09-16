import {
  listIssuesUrl,
  type ListIssuesQuery,
  type ListIssuesResponse,
  listIssuesResponseSchema,
} from '../../api/issue';
import type { GitcodeClient } from '../core';
import { parseGitUrl } from '../../utils';

export async function listIssues(
  client: GitcodeClient,
  url: string,
  query: ListIssuesQuery = { state: 'open' },
): Promise<ListIssuesResponse> {
  const parsed = parseGitUrl(url);
  if (!parsed?.owner || !parsed?.repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = listIssuesUrl(parsed.owner, parsed.repo);
  const q: Record<string, string | number | boolean> = {
    sort: 'updated',
  };
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) {
      q[k] = v;
    }
  }
  const json = await client.request(apiUrl, 'GET', { query: q });
  return listIssuesResponseSchema.parse(json);
}
