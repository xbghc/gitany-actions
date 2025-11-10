import { z } from 'zod';

/**
 * GitCode OAuth 2.0 token 响应 schema
 * 根据 https://docs.gitcode.com/docs/apis/oauth/ 定义
 */
export const oauthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('bearer'),
  expires_in: z.number(), // 秒数，默认为 1,296,000 (15天)
  refresh_token: z.string(),
  scope: z.string(), // 以空格分隔的 scope 列表
  created_at: z.string().optional(), // ISO 日期字符串或字符串格式的时间戳
});

export type OAuthTokenResponse = z.infer<typeof oauthTokenResponseSchema>;

/**
 * OAuth token 状态（包含过期时间）
 */
export interface OAuthTokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix 时间戳（毫秒）
  scope: string;
  tokenType: string;
}

/**
 * OAuth 客户端配置
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /**
   * 默认的 OAuth scope
   * 可用值: user, keys, groups, projects, pull_requests, issues, webhooks, repo
   */
  defaultScope?: string[];
  /**
   * OAuth 授权端点，默认为 https://gitcode.com/oauth/authorize
   */
  authorizationEndpoint?: string;
  /**
   * OAuth token 端点，默认为 https://gitcode.com/oauth/token
   */
  tokenEndpoint?: string;
}

/**
 * 生成授权 URL 的选项
 */
export interface AuthorizationUrlOptions {
  /**
   * OAuth scope，如果不提供则使用 OAuthConfig 中的 defaultScope
   */
  scope?: string[];
  /**
   * CSRF 保护的 state 参数，如果不提供则自动生成
   */
  state?: string;
}

/**
 * 授权 URL 生成结果
 */
export interface AuthorizationUrlResult {
  /**
   * 完整的授权 URL
   */
  url: string;
  /**
   * 用于验证回调的 state 参数
   */
  state: string;
}

/**
 * OAuth 错误响应 schema
 */
export const oauthErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
  error_uri: z.string().optional(),
});

export type OAuthErrorResponse = z.infer<typeof oauthErrorResponseSchema>;

/**
 * OAuth 错误类
 */
export class OAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public description?: string,
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

/**
 * Token 过期错误
 */
export class OAuthTokenExpiredError extends OAuthError {
  constructor(message = 'OAuth token has expired and could not be refreshed') {
    super(message, 'token_expired');
    this.name = 'OAuthTokenExpiredError';
  }
}
