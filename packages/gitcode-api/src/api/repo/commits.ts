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
    commit: z
      .object({
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
      })
      .optional(),
    url: z.string().optional(),
    sha: z.string().optional(),
  }),
  protected: z.boolean(),
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
  commit: z.object({
    author: z.object({
      date: z.string(),
      email: z.string(),
    }),
    committer: z.object({
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
    email: z.string(),
    login: z.string().optional(),
    type: z.string(),
  }),
  committer: z.object({
    date: z.string(),
    type: z.string(),
  }),
  html_url: z.string(),
  url: z.string(),
  sha: z.string(),
  parents: z.array(z.object({ sha: z.string(), url: z.string() })).optional(),
});

export type Commit = z.infer<typeof commitSchema>;
export type Commits = z.infer<typeof commitSchema>[];

export function commitsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/commits`;
}
