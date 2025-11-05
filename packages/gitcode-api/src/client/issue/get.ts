import { getIssueUrl, issueDetailSchema } from '../../api/issue/get.js';
import { parseGitUrl } from '../../utils/index.js';
import type { GitCodeClient } from '../core.js';

export async function getIssue(client: GitCodeClient, url: string, issueNumber: number) {
  const parsed = parseGitUrl(url);
  if (!parsed?.owner || !parsed?.repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = getIssueUrl(parsed.owner, parsed.repo, issueNumber);
  const json = await client.http.get(apiUrl).json();
  return issueDetailSchema.parse(json);
}
