import { prCountUrl, type PrCount, prCountSchema } from '../../api/pr/index.js';
import type { GitcodeClient } from '../core.js';
import { parseGitUrl } from '../../utils/index.js';

export async function getPullRequestCount(
  client: GitcodeClient,
  url: string,
): Promise<PrCount> {
  const { owner, repo } = parseGitUrl(url) || {};
  if (!owner || !repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = prCountUrl(owner, repo);
  const json = await client.request(apiUrl, 'GET', {
    searchParams: { only_count: true },
  });
  return prCountSchema.parse(json);
}
