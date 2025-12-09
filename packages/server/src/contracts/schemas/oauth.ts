import { z } from 'zod';

// ========== OAuth 授权 URL 响应 ==========
export const AuthorizeUrlResponseSchema = z.object({
  url: z.string().describe('OAuth 授权 URL'),
  state: z.string().describe('状态参数'),
});

// ========== OAuth Token 请求 ==========
export const ExchangeTokenBodySchema = z.object({
  code: z.string().min(1, 'Authorization code is required').describe('授权码'),
  state: z.string().optional().describe('状态参数'),
});

// ========== OAuth Token 响应 ==========
export const TokenResponseSchema = z.object({
  access_token: z.string().describe('访问令牌'),
  token_type: z.string().describe('令牌类型'),
  expires_in: z.number().optional().describe('过期时间（秒）'),
  refresh_token: z.string().optional().describe('刷新令牌'),
  scope: z.string().optional().describe('授权范围'),
});

// ========== 类型导出 ==========
export type AuthorizeUrlResponse = z.infer<typeof AuthorizeUrlResponseSchema>;
export type ExchangeTokenBody = z.infer<typeof ExchangeTokenBodySchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
