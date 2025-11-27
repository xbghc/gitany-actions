import { z } from 'zod';
import { API_BASE } from '../constants.js';

export const repoSettingsSchema = z.object({
  disable_fork: z.boolean().optional(),
  forbidden_developer_create_branch: z.boolean().optional(),
  forbidden_developer_create_tag: z.boolean().optional(),
  forbidden_committer_create_branch: z.boolean().optional(),
  generate_pre_merge_ref: z.boolean().optional(),
  forbidden_gitlab_access: z.boolean().optional(),
  rebase_disable_trigger_webhook: z.boolean().optional(),
  include_lfs_objects: z.boolean().optional(),
});

export type RepoSettings = z.infer<typeof repoSettingsSchema>;

export function repoSettingsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/repo_settings`;
}

export const pullRequestSettingsSchema = z.object({
  // PR设置相关字段
  reject_not_signed_by_gpg: z.boolean(),
  deny_force_push: z.boolean(),
  max_file_size: z.number(),
  skip_rule_for_owner: z.boolean(),
});

export type PullRequestSettings = z.infer<typeof pullRequestSettingsSchema>;

export function pullRequestSettingsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/pull_request_settings`;
}

export const repoEventsSchema = z.object({
  events: z.array(
    z.object({
      action: z.number(),
      action_name: z.string(),
      author: z.object({
        id: z.number(),
        iam_id: z.string(),
        username: z.string(),
        state: z.string(),
        avatar_url: z.string().optional(),
        email: z.string(),
        name: z.string(),
        name_cn: z.string(),
        web_url: z.string(),
      }),
      author_id: z.number(),
      author_username: z.string(),
      created_at: z.string(),
      project_id: z.number(),
      title: z.string().optional(),
      filter_sensitive: z.boolean().optional(),
      // 新增字段（根据实际 API 返回）
      note: z
        .object({
          id: z.number(),
          type: z.string().optional(),
          body: z.string(),
          author: z.object({
            id: z.number(),
            name: z.string(),
            username: z.string(),
            iam_id: z.string(),
            nick_name: z.string(),
            state: z.string(),
            avatar_url: z.string().optional(),
            email: z.string(),
            name_cn: z.string(),
            web_url: z.string(),
          }),
          created_at: z.string(),
          updated_at: z.string(),
          system: z.boolean(),
          noteable_id: z.number().optional(),
          noteable_type: z.string(),
          resolvable: z.boolean(),
          is_reply: z.boolean(),
          noteable_iid: z.number().optional(),
          discussion_id: z.string(),
          project: z.string(),
          diff: z.string(),
          archived: z.boolean(),
          review_categories_cn: z.string(),
          review_categories_en: z.string(),
          severity: z.string(),
          severity_cn: z.string(),
          severity_en: z.string(),
          proposer: z.object({
            id: z.number(),
            name: z.string(),
            username: z.string(),
            iam_id: z.string(),
            nick_name: z.string(),
            state: z.string(),
            avatar_url: z.string().optional(),
            email: z.string(),
            name_cn: z.string(),
            web_url: z.string(),
          }),
        })
        .optional(),
      project: z
        .object({
          main_repository_language: z.array(z.unknown()),
          star_count: z.number(),
          forks_count: z.number(),
          develop_mode: z.string(),
          stared: z.boolean(),
        })
        .optional(),
      project_name: z.string().optional(),
      target_id: z.number().optional(),
      target_iid: z.number().optional(),
      target_title: z.string().optional(),
      target_type: z.string().optional(),
      target_type_format: z.string().optional(),
      push_data: z
        .object({
          commit_count: z.number(),
          action: z.string(),
          ref_type: z.string(),
          commit_from: z.string().optional(),
          commit_to: z.string().optional(),
          ref: z.string(),
          commit_title: z.string().optional(),
        })
        .optional(),
      merge_request_info: z
        .object({
          source_branch: z.string(),
          source_project: z.string(),
          target_branch: z.string(),
          target_project: z.string(),
          user_notes_count: z.number(),
        })
        .optional(),
      _links: z
        .object({
          project: z.string(),
          action_type: z.string(),
        })
        .optional(),
    }),
  ),
  has_next_page: z.boolean(),
});

export type RepoEvent = z.infer<typeof repoEventsSchema>['events'][0];
export type RepoEvents = z.infer<typeof repoEventsSchema>;

/**
 * 仓库事件查询参数
 */
export type RepoEventsQuery = {
  /** 事件类型过滤：all(所有), push(push事件), merged(merged事件), issue(issue事件), comments(评论事件), team(团队事件), project(项目事件) */
  filter?: 'all' | 'push' | 'merged' | 'issue' | 'comments' | 'team' | 'project';
  /** 按作者用户名过滤 */
  author?: string;
  /** 起始日期，格式：YYYY-MM-DD */
  before?: string;
  /** 结束日期，格式：YYYY-MM-DD */
  after?: string;
  /** 当前页码 */
  page?: number;
  /** 每页数量 */
  per_page?: number;
};

export function repoEventsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/events`;
}
