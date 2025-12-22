import { http } from './request';
import type { ApiResponse } from './types';
import type {
  Issue,
  IssueComment,
  IssueFilterParams,
  CreateIssueBody,
  UpdateIssueBody,
  IssueCount,
} from '@/store/issue';

/**
 * 获取 Issue 列表
 */
export const getIssueList = (owner: string, repo: string, params?: IssueFilterParams) => {
  return http.get<ApiResponse<Issue[]>>(`/api/repo/${owner}/${repo}/issues`, {
    params,
  });
};

/**
 * 获取 Issue 详情
 */
export const getIssueDetail = (owner: string, repo: string, number: number) => {
  return http.get<ApiResponse<Issue>>(`/api/repo/${owner}/${repo}/issues/${number}`);
};

/**
 * 创建 Issue
 */
export const createIssue = (owner: string, repo: string, body: CreateIssueBody) => {
  return http.post<ApiResponse<Issue>>(`/api/repo/${owner}/${repo}/issues`, body);
};

/**
 * 更新 Issue
 */
export const updateIssue = (owner: string, repo: string, number: number, body: UpdateIssueBody) => {
  return http.patch<ApiResponse<Issue>>(`/api/repo/${owner}/${repo}/issues/${number}`, body);
};

/**
 * 获取 Issue 评论列表
 */
export const getIssueComments = (owner: string, repo: string, number: number) => {
  return http.get<ApiResponse<IssueComment[]>>(
    `/api/repo/${owner}/${repo}/issues/${number}/comments`,
  );
};

/**
 * 添加 Issue 评论
 */
export const createIssueComment = (owner: string, repo: string, number: number, body: string) => {
  return http.post<ApiResponse<IssueComment>>(
    `/api/repo/${owner}/${repo}/issues/${number}/comments`,
    { body },
  );
};

/**
 * 获取 Issue 数量统计
 */
export const getIssueCount = (owner: string, repo: string) => {
  return http.get<ApiResponse<IssueCount>>(`/api/repo/${owner}/${repo}/issues/count`);
};
