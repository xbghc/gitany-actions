import { parseGitUrl } from '../../utils/index.js';
import { updateIssueUrl, updatedIssueSchema, type UpdateIssueBody } from '../../api/issue/update.js';
import type { GitcodeClient } from '../core.js';

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
  const json = await client.http.patch(apiUrl, { json: body }).json();
  return updatedIssueSchema.parse(json);
}
