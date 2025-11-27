import { getPullRequestUrl, pullRequestDetailSchema } from '../../api/pr/get.js';
import { parseGitUrl } from '../../utils/index.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';
import type { PullRequestDetail } from '../../api/pr/get.js';

export async function getPullRequest(
  client: GitCodeClient,
  url: string,
  prNumber: number,
): Promise<PullRequestDetail> {
  const parsed = parseGitUrl(url);
  if (!parsed?.owner || !parsed?.repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = getPullRequestUrl(parsed.owner, parsed.repo, prNumber);
  const json = await client.http.get(apiUrl).json();
  return parseApiResponse(pullRequestDetailSchema, json, { endpoint: apiUrl, method: 'GET' });
}
