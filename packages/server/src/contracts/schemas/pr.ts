import { z } from 'zod';
import { PaginationSchema } from './common.js';

// ========== PR 状态 ==========
export const PRStateSchema = z.enum(['all', 'open', 'closed', 'merged']).default('all');

// ========== 查询参数 ==========
export const ListPRsQuerySchema = PaginationSchema.extend({
  state: PRStateSchema.optional().describe('PR 状态过滤'),
  sort: z.string().optional().describe('排序字段'),
  direction: z.enum(['asc', 'desc']).optional().describe('排序方向'),
  head: z.string().optional().describe('按 head 分支过滤'),
  base: z.string().optional().describe('按 base 分支过滤'),
});

// ========== 响应 Schema ==========
export const PRCountResponseSchema = z.object({
  all: z.number().describe('总数'),
  opened: z.number().describe('开放状态的 PR 数量'),
  closed: z.number().describe('关闭状态的 PR 数量'),
  merged: z.number().describe('已合并的 PR 数量'),
  locked: z.number().describe('锁定的 PR 数量'),
});

// ========== 请求 Body Schema ==========
export const CreatePRCommentBodySchema = z.object({
  body: z.string().min(1, 'Comment body is required').describe('评论内容'),
});

export const UpdatePRBodySchema = z.object({
  state: z.enum(['open', 'closed']).describe('PR 状态'),
});

// ========== 类型导出 ==========
export type ListPRsQuery = z.infer<typeof ListPRsQuerySchema>;
export type PRCountResponse = z.infer<typeof PRCountResponseSchema>;
export type CreatePRCommentBody = z.infer<typeof CreatePRCommentBodySchema>;
export type UpdatePRBody = z.infer<typeof UpdatePRBodySchema>;
