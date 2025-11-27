import {
  prCommentSchema,
  prCommentsUrl,
  type PRComment,
  type PRCommentQueryOptions,
} from '../../api/pr/index.js';
import { parseGitUrl, toQuery } from '../../utils/index.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

export async function listPullRequestComments(
  client: GitCodeClient,
  url: string,
  prNumber: number,
  queryOptions?: PRCommentQueryOptions,
): Promise<PRComment[]> {
  const parsed = parseGitUrl(url);
  if (!parsed?.owner || !parsed?.repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = prCommentsUrl(parsed.owner, parsed.repo, prNumber);
  const query = toQuery(queryOptions);
  const json = await client.http.get(apiUrl, { searchParams: query }).json();
  return parseApiResponse(prCommentSchema.array(), json, {
    endpoint: apiUrl,
    method: 'GET',
    params: { prNumber, ...query },
  });
}
