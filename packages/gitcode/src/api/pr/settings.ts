import { z } from 'zod';
import { API_BASE } from '../constants';

export const pullRequestSettingsSchema = z.object({
  allow_merge_commits: z.boolean(),
  allow_squash_commits: z.boolean(),
  allow_rebase_commits: z.boolean(),
  allow_updates_from_default_branch: z.boolean(),
  allow_worktree_inheritance: z.boolean(),
  allow_auto_close_on_conflict: z.boolean(),
});

export type PullRequestSettings = z.infer<typeof pullRequestSettingsSchema>;

export function pullRequestSettingsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/pull_request_settings`;
}
