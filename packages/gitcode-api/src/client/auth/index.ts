import type { GitCodeClient } from '../core.js';
import { OAuthClient } from './oauth.js';
import {
  type OAuthConfig,
  type OAuthTokenResponse,
  type OAuthTokenState,
  OAuthTokenExpiredError,
} from '../../types/oauth.js';

export type AuthConfig = {
  token?: string;
  authStyle?: 'query' | 'bearer' | 'token' | 'header';
  customAuthHeader?: string;
};

/**
 * GitCode 客户端认证管理
 *
 * 支持两种认证方式：
 * 1. Personal Access Token (PAT) - 传统方式
 * 2. OAuth 2.0 - 使用 access_token 和 refresh_token
 *
 * @example PAT 认证
 * ```typescript
 * const client = new GitCodeClient('your_pat_token');
 * // 或者
 * client.auth.setToken('your_pat_token');
 * ```
 *
 * @example OAuth 认证
 * ```typescript
 * const client = new GitCodeClient();
 * client.auth.configureOAuth({
 *   clientId: 'xxx',
 *   clientSecret: 'xxx',
 *   redirectUri: 'http://localhost:3000/callback',
 * });
 *
 * // 设置 OAuth token
 * client.auth.setOAuthToken(tokenResponse);
 *
 * // 自动刷新过期的 token
 * const validToken = await client.auth.getValidToken();
 * ```
 */
export class GitCodeClientAuth {
  private _token: string | undefined; // PAT
  private _oauthState: OAuthTokenState | undefined; // OAuth token 状态
  private _oauthClient: OAuthClient | undefined; // OAuth 客户端

  constructor(
    private client: GitCodeClient,
    token?: string,
  ) {
    // Priority: provided token > environment variable
    this._token = token || process.env.GITCODE_TOKEN;
  }

  /**
   * 设置 Personal Access Token
   *
   * @param token - GitCode Personal Access Token
   */
  setToken(token: string) {
    this._token = token;
  }

  /**
   * 获取当前的 token（同步方法，不刷新）
   *
   * 优先级：OAuth access_token > PAT
   *
   * @returns token 字符串，如果未配置则返回 undefined
   */
  token(): string | undefined {
    // 优先返回 OAuth token
    if (this._oauthState) {
      return this._oauthState.accessToken;
    }
    return this._token;
  }

  /**
   * 配置 OAuth 客户端
   *
   * @param config - OAuth 配置
   *
   * @example
   * ```typescript
   * client.auth.configureOAuth({
   *   clientId: process.env.OAUTH_CLIENT_ID!,
   *   clientSecret: process.env.OAUTH_CLIENT_SECRET!,
   *   redirectUri: 'http://localhost:3000/callback',
   * });
   * ```
   */
  configureOAuth(config: OAuthConfig) {
    this._oauthClient = new OAuthClient(config, this.client.http);
  }

  /**
   * 获取 OAuth 客户端（如果已配置）
   *
   * @returns OAuth 客户端实例，未配置则返回 undefined
   */
  getOAuthClient(): OAuthClient | undefined {
    return this._oauthClient;
  }

  /**
   * 设置 OAuth token
   *
   * @param tokenResponse - OAuth token 响应
   *
   * @example
   * ```typescript
   * const tokenResponse = await oauthClient.exchangeCodeForToken(code);
   * client.auth.setOAuthToken(tokenResponse);
   * ```
   */
  setOAuthToken(tokenResponse: OAuthTokenResponse) {
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    this._oauthState = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      scope: tokenResponse.scope,
      tokenType: tokenResponse.token_type,
    };
  }

  /**
   * 获取 OAuth token 状态
   *
   * @returns OAuth token 状态，未配置则返回 undefined
   */
  getOAuthState(): OAuthTokenState | undefined {
    return this._oauthState;
  }

  /**
   * 清除 OAuth token
   */
  clearOAuthToken() {
    this._oauthState = undefined;
  }

  /**
   * 获取有效的 token（异步方法，会自动刷新过期的 OAuth token）
   *
   * 如果使用 OAuth 且 token 即将过期（5 分钟内），自动刷新
   *
   * @returns 有效的 token 字符串
   * @throws {OAuthTokenExpiredError} 当 OAuth token 过期且无法刷新时
   * @throws {Error} 当没有配置任何认证方式时
   *
   * @example
   * ```typescript
   * const token = await client.auth.getValidToken();
   * // 使用 token 调用 API
   * ```
   */
  async getValidToken(): Promise<string> {
    // 如果使用 OAuth
    if (this._oauthState) {
      if (!this._oauthClient) {
        throw new Error('OAuth client not configured');
      }

      // 检查是否过期或即将过期
      if (this._oauthClient.isTokenExpired(this._oauthState.expiresAt)) {
        try {
          // 刷新 token
          const newToken = await this._oauthClient.refreshAccessToken(
            this._oauthState.refreshToken,
          );
          this.setOAuthToken(newToken);
          return newToken.access_token;
        } catch (error) {
          // 刷新失败，清除 OAuth 状态
          this._oauthState = undefined;
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new OAuthTokenExpiredError(`Failed to refresh token: ${message}`);
        }
      }

      return this._oauthState.accessToken;
    }

    // 使用 PAT
    if (this._token) {
      return this._token;
    }

    throw new Error('No authentication configured');
  }

  /**
   * 检查是否配置了认证
   *
   * @returns true 表示已配置 PAT 或 OAuth
   */
  isAuthenticated(): boolean {
    return !!(this._token || this._oauthState);
  }

  /**
   * 获取当前的认证类型
   *
   * @returns 'oauth', 'token', 或 'none'
   */
  getAuthType(): 'oauth' | 'token' | 'none' {
    if (this._oauthState) return 'oauth';
    if (this._token) return 'token';
    return 'none';
  }
}
