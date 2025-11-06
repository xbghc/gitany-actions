import { z } from 'zod';
import { API_BASE } from '../constants.js';

export const repoSettingsSchema = z.object({
  disable_fork: z.boolean().optional(),
  forbidden_developer_create_branch: z.boolean().optional(),
  forbidden_developer_create_tag: z.boolean().optional(),
  forbidden_committer_create_branch: z.boolean().optional(),
  generate_pre_merge_ref: z.boolean().optional(),
  forbidden_gitlab_access: z.boolean().optional(),
  rebase_disable_trigger_webhook: z.boolean().optional(),
  include_lfs_objects: z.boolean().optional(),
});

export type RepoSettings = z.infer<typeof repoSettingsSchema>;

export function repoSettingsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/repo_settings`;
}

export const pullRequestSettingsSchema = z.object({
  // PR设置相关字段
  reject_not_signed_by_gpg: z.boolean(),
  deny_force_push: z.boolean(),
  max_file_size: z.number(),
  skip_rule_for_owner: z.boolean(),
});

export type PullRequestSettings = z.infer<typeof pullRequestSettingsSchema>;

export function pullRequestSettingsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/pull_request_settings`;
}

export const repoEventsSchema = z.array(
  z.object({
    id: z.string(),
    type: z.string(),
    actor: z.any(),
    repo: z.any(),
    payload: z.any(),
    public: z.boolean(),
    created_at: z.string(),
    org: z.any().optional(),
  }),
);

export type RepoEvent = z.infer<typeof repoEventsSchema>[0];
export type RepoEvents = z.infer<typeof repoEventsSchema>;

export function repoEventsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/events`;
}
