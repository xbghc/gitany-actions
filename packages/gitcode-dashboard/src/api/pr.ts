import { http } from './request';
import type { PullRequest, PRComment, PRFilterParams, ApiResponse, PrCount } from '@/types';

/**
 * 获取 PR 列表
 */
export const getPRList = (owner: string, repo: string, params?: PRFilterParams) => {
  return http.get<ApiResponse<PullRequest[]>>(`/api/repo/${owner}/${repo}/pulls`, {
    params,
  });
};

/**
 * 获取 PR 详情
 */
export const getPRDetail = (owner: string, repo: string, number: number) => {
  return http.get<ApiResponse<PullRequest>>(`/api/repo/${owner}/${repo}/pulls/${number}`);
};

/**
 * 获取 PR 评论列表
 */
export const getPRComments = (owner: string, repo: string, number: number) => {
  return http.get<ApiResponse<PRComment[]>>(`/api/repo/${owner}/${repo}/pulls/${number}/comments`);
};

/**
 * 添加 PR 评论
 */
export const createPRComment = (owner: string, repo: string, number: number, body: string) => {
  return http.post<ApiResponse<PRComment>>(`/api/repo/${owner}/${repo}/pulls/${number}/comments`, {
    body,
  });
};

/**
 * 更新 PR 状态
 */
export const updatePRState = (
  owner: string,
  repo: string,
  number: number,
  state: 'open' | 'closed',
) => {
  return http.patch<ApiResponse<PullRequest>>(`/api/repo/${owner}/${repo}/pulls/${number}`, {
    state,
  });
};

/**
 * 合并 PR
 */
export const mergePR = (owner: string, repo: string, number: number) => {
  return http.put<ApiResponse<PullRequest>>(`/api/repo/${owner}/${repo}/pulls/${number}/merge`, {});
};

/**
 * 获取 PR 数量统计
 */
export const getPRCount = (owner: string, repo: string) => {
  return http.get<ApiResponse<PrCount>>(`/api/repo/${owner}/${repo}/pulls/count`);
};
