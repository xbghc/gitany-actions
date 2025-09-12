import {
  prCommentsUrl,
  type PRComment,
  type PRCommentQueryOptions,
  prCommentSchema,
} from '../../api/pr';
import type { GitcodeClient } from '../core';
import { parseGitUrl } from '../../utils';

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
  const query: Record<string, string | number | boolean> = {};
  // TODO 另外一个文件中的方法也有将query转化的方法，考虑能不能统一在utils文件中
  if (queryOptions) {
    for (const [k, v] of Object.entries(queryOptions)) {
      if (v !== undefined) query[k] = v as string;
    }
  }
  const json = await client.request(apiUrl, 'GET', { query });
  return prCommentSchema.array().parse(json);
}

