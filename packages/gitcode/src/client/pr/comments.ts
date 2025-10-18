import {
  prCommentsUrl,
  type PRComment,
  type PRCommentQueryOptions,
  prCommentSchema,
} from '../../api/pr/index.js';
import type { GitcodeClient } from '../core.js';
import { parseGitUrl, toQuery } from '../../utils/index.js';

export async function listPullRequestComments(
  client: GitcodeClient,
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
  const json = await client.request(apiUrl, 'GET', { searchParams: query });
  return prCommentSchema.array().parse(json);
}
