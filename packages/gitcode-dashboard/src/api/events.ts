import { http } from './request';
import type { ApiResponse } from './types';

// ============================================
// Event API 类型定义
// ============================================

/** 仓库事件作者信息 */
export interface RepoEventAuthor {
  id: number;
  iam_id: string;
  username: string;
  state: string;
  avatar_url?: string;
  email: string;
  name: string;
  name_cn: string;
  web_url: string;
}

/** 事件评论对象 */
export interface RepoEventNote {
  id: number;
  type?: string;
  body: string;
  author: {
    id: number;
    name: string;
    username: string;
    iam_id: string;
    nick_name: string;
    state: string;
    avatar_url: string;
    email: string;
    name_cn: string;
    web_url: string;
  };
  created_at: string;
  updated_at: string;
  system: boolean;
  noteable_id: number;
  noteable_type: string;
  resolvable: boolean;
  is_reply: boolean;
  noteable_iid: number;
  discussion_id: string;
  project: string;
  diff: string;
  archived: boolean;
  review_categories_cn: string;
  review_categories_en: string;
  severity: string;
  severity_cn: string;
  severity_en: string;
  proposer: {
    id: number;
    name: string;
    username: string;
    iam_id: string;
    nick_name: string;
    state: string;
    avatar_url: string;
    email: string;
    name_cn: string;
    web_url: string;
  };
}

/** 事件项目信息 */
export interface RepoEventProject {
  main_repository_language: string[];
  star_count: number;
  forks_count: number;
  develop_mode: string;
  stared: boolean;
}

/** 事件相关链接 */
export interface RepoEventLinks {
  project: string;
  action_type: string;
}

/** Push 事件数据 */
export interface RepoPushData {
  commit_count: number;
  action: string;
  ref_type: string;
  commit_from?: string;
  commit_to: string;
  ref: string;
  commit_title: string;
}

/** MergeRequest 事件数据 */
export interface RepoMergeRequestInfo {
  source_branch: string;
  source_project: string;
  target_branch: string;
  target_project: string;
  user_notes_count: number;
}

/** 单个仓库事件 */
export interface RepoEvent {
  action: number;
  action_name: string;
  author: RepoEventAuthor;
  author_id: number;
  author_username: string;
  created_at: string;
  project_id: number;
  title?: string;
  filter_sensitive?: boolean;
  note?: RepoEventNote;
  project?: RepoEventProject;
  project_name?: string;
  target_id?: number;
  target_iid?: number;
  target_title?: string;
  target_type?: string;
  target_type_format?: string;
  push_data?: RepoPushData;
  merge_request_info?: RepoMergeRequestInfo;
  _links?: RepoEventLinks;
}

/** 仓库事件列表响应 */
export interface RepoEventsResponse {
  events: RepoEvent[];
  has_next_page: boolean;
}

/** Event 筛选参数 */
export interface EventFilterParams {
  /** 事件类型 */
  filter?: 'all' | 'push' | 'merged' | 'issue' | 'comments' | 'team' | 'project';
  /** 作者用户名 */
  author?: string;
  /** 起始日期 YYYY-MM-DD */
  before?: string;
  /** 结束日期 YYYY-MM-DD */
  after?: string;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  per_page?: number;
}

/**
 * 获取仓库事件列表
 */
export const getRepoEvents = (owner: string, repo: string, params?: EventFilterParams) => {
  return http.get<ApiResponse<RepoEventsResponse>>(`/api/repo/${owner}/${repo}/events`, {
    params,
  });
};
