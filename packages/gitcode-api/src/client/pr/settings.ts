import {
  pullRequestSettingsSchema,
  pullRequestSettingsUrl,
  type PullRequestSettings,
} from '../../api/pr/index.js';
import type { GitCodeClient } from '../core.js';

export async function getPullRequestSettings(
  client: GitCodeClient,
  owner: string,
  repo: string,
): Promise<PullRequestSettings> {
  const url = pullRequestSettingsUrl(owner, repo);
  const data = await client.http.get(url).json();
  return pullRequestSettingsSchema.parse(data);
}
