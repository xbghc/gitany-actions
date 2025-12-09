import { z } from 'zod';

// ========== 路径参数 ==========
export const RepoParamsSchema = z.object({
  owner: z.string().describe('仓库所有者'),
  repo: z.string().describe('仓库名称'),
});

export const RepoNumberParamsSchema = RepoParamsSchema.extend({
  number: z.coerce.number().int().positive().describe('PR/Issue 编号'),
});

// ========== 分页参数 ==========
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional().describe('页码（从 1 开始）'),
  per_page: z.coerce.number().int().min(1).max(100).default(20).optional().describe('每页数量'),
});

// ========== 响应格式 ==========
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
  });

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('错误类型'),
  message: z.string().describe('错误详细信息'),
  details: z.record(z.unknown()).optional().describe('额外错误详情'),
});

export const MessageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

// ========== 通用类型导出 ==========
export type RepoParams = z.infer<typeof RepoParamsSchema>;
export type RepoNumberParams = z.infer<typeof RepoNumberParamsSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
