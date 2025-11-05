import {
  issueCommentsUrl,
  issueCommentSchema,
  type IssueCommentsQuery,
  type IssueComment,
} from '../../api/issue/index.js';
import type { GitcodeClient } from '../core.js';
import { parseGitUrl } from '../../utils/index.js';

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
  const json = await client.http.get(apiUrl, { searchParams: q }).json();
  return issueCommentSchema.array().parse(json);
}
