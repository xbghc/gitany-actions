import { z } from 'zod';
import { PaginationSchema } from './common.js';

// ========== 事件过滤类型 ==========
export const EventFilterSchema = z.enum([
  'all',
  'push',
  'merged',
  'issue',
  'comments',
  'team',
  'project',
]);

// ========== 查询参数 ==========
export const ListEventsQuerySchema = PaginationSchema.extend({
  filter: EventFilterSchema.optional().describe('事件类型过滤'),
  author: z.string().optional().describe('按作者用户名过滤'),
  before: z.string().optional().describe('结束日期（YYYY-MM-DD）'),
  after: z.string().optional().describe('开始日期（YYYY-MM-DD）'),
});

// ========== 事件作者 ==========
export const RepoEventAuthorSchema = z.object({
  id: z.number().describe('用户 ID'),
  iam_id: z.string().describe('IAM ID'),
  username: z.string().describe('用户名'),
  state: z.string().describe('用户状态'),
  avatar_url: z.string().optional().describe('头像 URL'),
  email: z.string().describe('邮箱地址'),
  name: z.string().describe('用户名称'),
  name_cn: z.string().describe('用户中文名称'),
  web_url: z.string().describe('用户主页 URL'),
});

// ========== 事件 ==========
export const RepoEventSchema = z.object({
  action: z.number().describe('事件动作类型代码'),
  action_name: z.string().describe('事件动作名称'),
  author: RepoEventAuthorSchema,
  author_id: z.number().describe('作者 ID'),
  author_username: z.string().describe('作者用户名'),
  created_at: z.string().describe('事件创建时间'),
  project_id: z.number().describe('项目 ID'),
  title: z.string().optional().describe('事件标题'),
  target_title: z.string().optional().describe('目标资源标题'),
  target_type: z.string().optional().describe('目标类型'),
});

// ========== 事件列表响应 ==========
export const RepoEventsResponseSchema = z.object({
  events: z.array(RepoEventSchema).describe('事件列表'),
  has_next_page: z.boolean().describe('是否有下一页'),
});

// ========== 类型导出 ==========
export type EventFilter = z.infer<typeof EventFilterSchema>;
export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;
export type RepoEventAuthor = z.infer<typeof RepoEventAuthorSchema>;
export type RepoEvent = z.infer<typeof RepoEventSchema>;
export type RepoEventsResponse = z.infer<typeof RepoEventsResponseSchema>;
