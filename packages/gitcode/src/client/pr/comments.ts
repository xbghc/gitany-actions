import {
  prCommentsUrl,
  type PRComment,
  type PRCommentQueryOptions,
  prCommentSchema,
} from '../../api/pr';
import type { GitcodeClient } from '../core';
import { parseGitUrl, toQuery } from '../../utils';

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
  const json = await client.request(apiUrl, 'GET', { query });
  return prCommentSchema.array().parse(json);
}
