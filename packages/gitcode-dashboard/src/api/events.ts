import type { ApiResponse } from '@/types';
import type { RepoEventsResponse } from '@/types';
import { http } from './request';

export interface EventsFilterParams {
  filter?: 'all' | 'push' | 'merged' | 'issue' | 'comments' | 'team' | 'project';
  author?: string;
  before?: string; // YYYY-MM-DD
  after?: string; // YYYY-MM-DD
  page?: number;
  per_page?: number;
}

/**
 * 获取仓库事件列表
 */
export const getRepoEvents = (owner: string, repo: string, params?: EventsFilterParams) => {
  return http.get<ApiResponse<RepoEventsResponse>>(`/api/repo/${owner}/${repo}/events`, {
    params,
  });
};
