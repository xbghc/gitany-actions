import { z } from 'zod';
import { PaginationSchema } from './common.js';

// ========== Issue 状态 ==========
export const IssueStateSchema = z.enum(['all', 'open', 'closed']).default('all');

// ========== 查询参数 ==========
export const ListIssuesQuerySchema = PaginationSchema.extend({
  state: IssueStateSchema.optional().describe('Issue 状态过滤'),
  sort: z.enum(['created', 'updated', 'comments']).optional().describe('排序字段'),
  labels: z.string().optional().describe('标签过滤（逗号分隔）'),
});

// ========== 响应 Schema ==========
export const IssueCountResponseSchema = z.object({
  all: z.number().describe('总数'),
  opened: z.number().describe('开放状态的 Issue 数量'),
  closed: z.number().describe('关闭状态的 Issue 数量'),
});

// ========== 请求 Body Schema ==========
export const CreateIssueBodySchema = z.object({
  title: z.string().min(1, 'Issue title is required').describe('Issue 标题'),
  body: z.string().optional().describe('Issue 描述'),
  labels: z.string().optional().describe('标签（逗号分隔）'),
  assignees: z.string().optional().describe('分配给的用户（逗号分隔）'),
});

export const UpdateIssueBodySchema = z.object({
  title: z.string().optional().describe('Issue 标题'),
  body: z.string().optional().describe('Issue 描述'),
  state: z.enum(['open', 'closed']).optional().describe('Issue 状态'),
  labels: z.array(z.string()).optional().describe('标签列表'),
  assignees: z.string().optional().describe('分配给的用户（逗号分隔）'),
});

export const CreateIssueCommentBodySchema = z.object({
  body: z.string().min(1, 'Comment body is required').describe('评论内容'),
});

// ========== 类型导出 ==========
export type ListIssuesQuery = z.infer<typeof ListIssuesQuerySchema>;
export type IssueCountResponse = z.infer<typeof IssueCountResponseSchema>;
export type CreateIssueBody = z.infer<typeof CreateIssueBodySchema>;
export type UpdateIssueBody = z.infer<typeof UpdateIssueBodySchema>;
export type CreateIssueCommentBody = z.infer<typeof CreateIssueCommentBodySchema>;
