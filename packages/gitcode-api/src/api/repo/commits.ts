import { z } from 'zod';
import { API_BASE } from '../constants.js';

export const contributorsSchema = z.array(
  z.object({
    name: z.string(),
    contributions: z.number(),
    email: z.string(),
  }),
);

export type Contributor = z.infer<typeof contributorsSchema>[0];
export type Contributors = z.infer<typeof contributorsSchema>;

export function contributorsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/contributors`;
}

export const branchSchema = z.object({
  name: z.string(),
  commit: z.object({
    id: z.string(),
    message: z.string(),
    parent_ids: z.array(z.string()),
    authored_date: z.string(),
    author_name: z.string(),
    author_iam_id: z.string().optional(), // 实际 API 不返回此字段
    author_email: z.string(),
    author_user_name: z.string().optional(), // 实际 API 不返回此字段
    committed_date: z.string(),
    committer_name: z.string(),
    committer_email: z.string(),
    committer_user_name: z.string().optional(), // 实际 API 不返回此字段
    open_gpg_verified: z.any().optional(), // 实际 API 不返回此字段
    verification_status: z.any().optional(), // 实际 API 不返回此字段
    gpg_primary_key_id: z.any().optional(), // 实际 API 不返回此字段
    short_id: z.string(),
    created_at: z.string(),
    title: z.string(),
    author_avatar_url: z.string().optional(), // 实际 API 不返回此字段
    committer_avatar_url: z.string().optional(), // 实际 API 不返回此字段
    relate_url: z.string().optional(), // 实际 API 不返回此字段
  }),
  merged: z.boolean(),
  protected: z.boolean(),
  developers_can_push: z.boolean(),
  developers_can_merge: z.boolean(),
  can_push: z.boolean(),
  default: z.boolean(),
});

export type Branch = z.infer<typeof branchSchema>;
export type Branches = z.infer<typeof branchSchema>[];

export function branchesUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/branches`;
}

export function branchUrl(owner: string, repo: string, branch: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`;
}

export const commitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    author: z.object({
      name: z.string(),
      date: z.string(),
      email: z.string(),
    }),
    committer: z.object({
      name: z.string(),
      date: z.string(),
      email: z.string(),
    }),
    message: z.string(),
    tree: z.object({
      sha: z.string(),
      url: z.string(),
    }),
  }),
  author: z.object({
    name: z.string(),
    id: z.number(),
    login: z.string(),
    type: z.string(),
  }),
  committer: z.object({
    name: z.string(),
    id: z.number(),
    login: z.string(),
    type: z.string(),
  }),
  html_url: z.string(),
  url: z.string(),
});

export type Commit = z.infer<typeof commitSchema>;
export type Commits = z.infer<typeof commitSchema>[];

export function commitsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/commits`;
}
