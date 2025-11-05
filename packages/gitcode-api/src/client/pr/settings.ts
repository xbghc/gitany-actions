import {
  pullRequestSettingsSchema,
  pullRequestSettingsUrl,
  type PullRequestSettings,
} from '../../api/pr/index.js';
import type { GitcodeClient } from '../core.js';

export async function getPullRequestSettings(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<PullRequestSettings> {
  const url = pullRequestSettingsUrl(owner, repo);
  const data = await client.http.get(url).json();
  return pullRequestSettingsSchema.parse(data);
}
