import { prCountSchema, prCountUrl, type PrCount } from '../../api/pr/index.js';
import { parseGitUrl } from '../../utils/index.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

export async function getPullRequestCount(client: GitCodeClient, url: string): Promise<PrCount> {
  const { owner, repo } = parseGitUrl(url) || {};
  if (!owner || !repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const apiUrl = prCountUrl(owner, repo);
  const json = await client.http
    .get(apiUrl, {
      searchParams: { only_count: true },
    })
    .json();
  return parseApiResponse(prCountSchema, json, {
    endpoint: apiUrl,
    method: 'GET',
    params: { only_count: true },
  });
}
