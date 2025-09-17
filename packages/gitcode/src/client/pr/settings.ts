import {
  pullRequestSettingsSchema,
  pullRequestSettingsUrl,
  type PullRequestSettings,
} from '../../api/pr';
import type { GitcodeClient } from '../core';

export async function getPullRequestSettings(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<PullRequestSettings> {
  const url = pullRequestSettingsUrl(owner, repo);
  const data = await client.request<unknown>(url, 'GET', {});
  return pullRequestSettingsSchema.parse(data);
}
