import { parseGitUrl } from '../../utils';
import { updateIssueUrl, updatedIssueSchema, type UpdateIssueBody } from '../../api/issue/update';
import type { GitcodeClient } from '../core';

export async function updateIssue(
  client: GitcodeClient,
  url: string,
  issueNumber: number,
  body: UpdateIssueBody,
) {
  const parsed = parseGitUrl(url);
  if (!parsed?.owner || !parsed?.repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }

  const apiUrl = updateIssueUrl(parsed.owner, parsed.repo, issueNumber);
  const json = await client.request(apiUrl, 'PATCH', { body });
  return updatedIssueSchema.parse(json);
}

