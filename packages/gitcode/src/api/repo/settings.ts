import { z } from 'zod';
import { API_BASE } from '../constants';

export const repoSettingsSchema = z.object({
  // 仓库设置相关字段，根据API文档定义
  default_branch: z.string().optional(),
  has_issues: z.boolean().optional(),
  has_wiki: z.boolean().optional(),
  has_pull_requests: z.boolean().optional(),
  has_projects: z.boolean().optional(),
  allow_squash_merge: z.boolean().optional(),
  allow_merge_commit: z.boolean().optional(),
  allow_rebase_merge: z.boolean().optional(),
  delete_branch_on_merge: z.boolean().optional(),
});

export type RepoSettings = z.infer<typeof repoSettingsSchema>;

export function repoSettingsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/repo_settings`;
}

export const pullRequestSettingsSchema = z.object({
  // PR设置相关字段
  allow_merge_commits: z.boolean().optional(),
  allow_squash_commits: z.boolean().optional(),
  allow_rebase_commits: z.boolean().optional(),
  allow_updates_from_default_branch: z.boolean().optional(),
  allow_worktree_inheritance: z.boolean().optional(),
  allow_auto_close_on_conflict: z.boolean().optional(),
});

export type PullRequestSettings = z.infer<typeof pullRequestSettingsSchema>;

export function pullRequestSettingsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/pull_request_settings`;
}

export const repoEventsSchema = z.array(z.object({
  id: z.string(),
  type: z.string(),
  actor: z.any(),
  repo: z.any(),
  payload: z.any(),
  public: z.boolean(),
  created_at: z.string(),
  org: z.any().optional(),
}));

export type RepoEvent = z.infer<typeof repoEventsSchema>[0];
export type RepoEvents = z.infer<typeof repoEventsSchema>;

export function repoEventsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/events`;
}