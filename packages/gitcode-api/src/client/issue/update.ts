import {
  updateIssueUrl,
  updatedIssueSchema,
  type UpdateIssueBody,
} from '../../api/issue/update.js';
import { parseGitUrl } from '../../utils/index.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

export async function updateIssue(
  client: GitCodeClient,
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
  return parseApiResponse(updatedIssueSchema, json, { endpoint: apiUrl, method: "GET" });
}
