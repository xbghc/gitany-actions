import { z } from 'zod';
import { API_BASE } from '../constants';

export const fileBlobSchema = z.object({
  sha: z.string(),
  size: z.number(),
  url: z.string(),
  content: z.string(),
  encoding: z.string(),
});

export type FileBlob = z.infer<typeof fileBlobSchema>;

export function fileBlobUrl(owner: string, repo: string, sha: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/git/blobs/${sha}`;
}

export const compareSchema = z.object({
  base_commit: z.object({
    url: z.string(),
    sha: z.string(),
    html_url: z.string(),
    comments_url: z.string(),
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
      tree: z.object({
        sha: z.string(),
        url: z.string(),
      }),
      message: z.string(),
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
    parents: z.array(z.object({
      sha: z.string(),
      url: z.string(),
    })),
  }),
  merge_base_commit: z.object({
    url: z.string(),
    sha: z.string(),
    html_url: z.string(),
    comments_url: z.string(),
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
      tree: z.object({
        sha: z.string(),
        url: z.string(),
      }),
      message: z.string(),
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
    parents: z.array(z.object({
      sha: z.string(),
      url: z.string(),
    })),
  }),
  commits: z.array(z.object({
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
    }),
    author: z.object({
      name: z.string(),
      id: z.number(),
      login: z.string(),
    }),
    committer: z.object({
      name: z.string(),
      id: z.number(),
      login: z.string(),
    }),
  })),
  files: z.array(z.object({
    sha: z.string(),
    filename: z.string(),
    status: z.string(),
    additions: z.number(),
    deletions: z.number(),
    changes: z.number(),
    blob_url: z.string(),
    raw_url: z.string(),
    patch: z.string().optional(),
    truncated: z.number(),
  })),
  truncated: z.number(),
});

export type Compare = z.infer<typeof compareSchema>;

export function compareUrl(owner: string, repo: string, base: string, head: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/compare/${base}...${head}`;
}