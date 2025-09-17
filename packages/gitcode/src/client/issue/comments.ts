import {
  issueCommentsUrl,
  issueCommentSchema,
  type IssueCommentsQuery,
  type IssueComment,
} from '../../api/issue';
import type { GitcodeClient } from '../core';
import { parseGitUrl } from '../../utils';

export async function listIssueComments(
  client: GitcodeClient,
  url: string,
  issueNumber: number,
  query: IssueCommentsQuery = {},
): Promise<IssueComment[]> {
  const parsed = parseGitUrl(url);
  if (!parsed?.owner || !parsed?.repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = issueCommentsUrl(parsed.owner, parsed.repo, issueNumber);
  const q: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) {
      q[k] = v;
    }
  }
  const json = await client.request(apiUrl, 'GET', { searchParams: q });
  return issueCommentSchema.array().parse(json);
}
