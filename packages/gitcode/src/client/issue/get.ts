import { getIssueUrl } from '../../api/issue/get';
import type { GitcodeClient } from '../core';
import { parseGitUrl } from '../../utils';
import { issueDetailSchema } from '../../api/issue/get';

export async function getIssue(client: GitcodeClient, url: string, issueNumber: number) {
  const parsed = parseGitUrl(url);
  if (!parsed?.owner || !parsed?.repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = getIssueUrl(parsed.owner, parsed.repo, issueNumber);
  const json = await client.request(apiUrl, 'GET');
  return issueDetailSchema.parse(json);
}
