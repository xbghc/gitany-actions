import { z } from 'zod';
import { API_BASE } from '../constants.js';

/**
 * 通知触发者 Schema
 */
export const notificationActorSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string(),
});

/**
 * 通知中的仓库信息 Schema
 */
export const notificationRepositorySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  human_name: z.string(),
  url: z.string(),
});

/**
 * 通知 Schema
 */
export const notificationSchema = z.object({
  id: z.string(),
  content: z.string(),
  type: z.string(), // 实际类型如：mention_mention, mention_at 等
  unread: z.boolean(),
  update_at: z.string(), // 注意：API 返回的是 update_at 而不是 updated_at
  html_url: z.string(),
  actor: notificationActorSchema,
  repository: notificationRepositorySchema,
});

/**
 * 通知响应 Schema（包含分页信息）
 */
export const notificationsResponseSchema = z.object({
  total: z.number(),
  list: z.array(notificationSchema),
});

/**
 * 通知类型
 */
export type Notification = z.infer<typeof notificationSchema>;

/**
 * 通知触发者类型
 */
export type NotificationActor = z.infer<typeof notificationActorSchema>;

/**
 * 通知响应类型
 */
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;

/**
 * 通知列表类型（兼容性保留）
 */
export type Notifications = Notification[];

/**
 * 通知查询参数
 */
export interface NotificationQuery {
  /** 通知类型筛选：all（全部）、event（事件通知）、refer（提及通知） */
  type?: 'all' | 'event' | 'refer';
  /** 是否只显示未读通知 */
  unread?: boolean;
  /** 只显示从此时间之后更新的通知（ISO 8601 格式） */
  since?: string;
  /** 只显示此时间之前更新的通知（ISO 8601 格式） */
  before?: string;
}

/**
 * 构造获取仓库通知的 URL
 *
 * @param owner - 仓库所有者
 * @param repo - 仓库名称
 * @returns API URL
 */
export function notificationsUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/notifications`;
}
