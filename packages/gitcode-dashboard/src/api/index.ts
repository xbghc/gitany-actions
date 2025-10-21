// Assuming this file exists and contains the base client setup
import { client } from './client';
import type { Issue, IssueFilterParams, IssueCount } from '@/types';

export const getIssueList = (owner: string, repo: string, params: IssueFilterParams) => {
  return client.get(`/repos/${owner}/${repo}/issues`, { params });
};

export const getIssueCount = (owner: string, repo: string) => {
  // This is a simplified mock. In a real scenario, this might be a separate endpoint
  // or derived from headers of the list request.
  return client.get<{ all: number; opened: number; closed: number }>(`/repos/${owner}/${repo}/issues/count`);
};

export const getIssueDetail = (owner: string, repo: string, issueNumber: number) => {
  return client.get<Issue>(`/repos/${owner}/${repo}/issues/${issueNumber}`);
};

export const createIssue = (owner: string, repo: string, data: { title: string; body: string }) => {
  return client.post(`/repos/${owner}/${repo}/issues`, data);
};
