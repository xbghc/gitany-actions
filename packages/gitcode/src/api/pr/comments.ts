import { API_BASE } from '../constants';

export interface PRCommentQueryOptions {
  comment_type: 'diff_comment' | 'pr_comment';
}

export interface PRComment {
  id: number;
  body: string;
  user: {
    id: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function prCommentsUrl(owner: string, repo: string, prNumber: number) {
  return `${API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
}
