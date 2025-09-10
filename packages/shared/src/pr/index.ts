export type PullRequestState = 'open' | 'closed' | 'all';

export interface PullRequest {
  id: number;
  title: string;
  state: PullRequestState;
  body?: string;
  raw?: unknown; // Original data from the remote API
}

export interface CreatePullRequestParams {
  title: string;
  body?: string;
  head: string;
  base: string;
}
