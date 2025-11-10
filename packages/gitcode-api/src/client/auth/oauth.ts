import got, { type Got } from 'got';
import {
  type AuthorizationUrlOptions,
  type AuthorizationUrlResult,
  type OAuthConfig,
  OAuthError,
  oauthErrorResponseSchema,
  type OAuthTokenResponse,
  oauthTokenResponseSchema,
} from '../../types/oauth.js';

/**
 * GitCode OAuth 2.0 客户端
 *
 * 实现标准的 OAuth 2.0 授权码流程：
 * 1. 生成授权 URL
 * 2. 用户授权后获取 code
 * 3. 使用 code 换取 access_token 和 refresh_token
 * 4. 使用 refresh_token 刷新过期的 access_token
 *
 * @example
 * ```typescript
 * const oauth = new OAuthClient({
 *   clientId: 'your_client_id',
 *   clientSecret: 'your_client_secret',
 *   redirectUri: 'http://localhost:3000/callback',
 * });
 *
 * // 1. 生成授权 URL
 * const { url, state } = oauth.generateAuthorizationUrl({
 *   scope: ['user', 'repo'],
 * });
 *
 * // 2. 用户授权后，使用 code 换取 token
 * const tokenResponse = await oauth.exchangeCodeForToken(code);
 *
 * // 3. Token 过期后刷新
 * const newToken = await oauth.refreshAccessToken(tokenResponse.refresh_token);
 * ```
 */
export class OAuthClient {
  private readonly config: Required<OAuthConfig>;
  private readonly http: Got;

  private static readonly DEFAULT_AUTHORIZATION_ENDPOINT = 'https://gitcode.com/oauth/authorize';
  private static readonly DEFAULT_TOKEN_ENDPOINT = 'https://gitcode.com/oauth/token';
  private static readonly DEFAULT_SCOPE = ['user', 'repo'];

  constructor(config: OAuthConfig, httpClient?: Got) {
    this.config = {
      ...config,
      defaultScope: config.defaultScope || OAuthClient.DEFAULT_SCOPE,
      authorizationEndpoint:
        config.authorizationEndpoint || OAuthClient.DEFAULT_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: config.tokenEndpoint || OAuthClient.DEFAULT_TOKEN_ENDPOINT,
    };

    this.http = httpClient || got;
  }

  /**
   * 生成 OAuth 授权 URL
   *
   * @param options - 授权选项
   * @returns 授权 URL 和 state 参数
   *
   * @example
   * ```typescript
   * const { url, state } = oauth.generateAuthorizationUrl({
   *   scope: ['user', 'repo', 'pull_requests'],
   *   state: 'custom-state-value',
   * });
   * // 将用户重定向到 url，并保存 state 用于后续验证
   * ```
   */
  generateAuthorizationUrl(options: AuthorizationUrlOptions = {}): AuthorizationUrlResult {
    const scope = options.scope || this.config.defaultScope;
    const state = options.state || this.generateRandomState();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scope.join(' '),
      state,
    });

    const url = `${this.config.authorizationEndpoint}?${params.toString()}`;

    return { url, state };
  }

  /**
   * 使用授权码换取 access token
   *
   * @param code - 用户授权后返回的授权码
   * @returns OAuth token 响应（包含 access_token 和 refresh_token）
   * @throws {OAuthError} 当 token 交换失败时
   *
   * @example
   * ```typescript
   * // 在 OAuth 回调中接收 code
   * const code = req.query.code;
   * const tokenResponse = await oauth.exchangeCodeForToken(code);
   *
   * console.log('Access Token:', tokenResponse.access_token);
   * console.log('Expires in:', tokenResponse.expires_in, 'seconds');
   * ```
   */
  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const body = {
      grant_type: 'authorization_code',
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
    };

    return this.requestToken(body);
  }

  /**
   * 刷新过期的 access token
   *
   * @param refreshToken - 之前获取的 refresh_token
   * @returns 新的 OAuth token 响应
   * @throws {OAuthError} 当 token 刷新失败时
   *
   * @example
   * ```typescript
   * const newToken = await oauth.refreshAccessToken(oldToken.refresh_token);
   * // 使用新的 access_token 继续调用 API
   * ```
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const body = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    };

    return this.requestToken(body);
  }

  /**
   * 检查 token 是否已过期或即将过期
   *
   * @param expiresAt - Token 过期时间（Unix 时间戳，毫秒）
   * @param bufferSeconds - 提前多少秒判定为过期（默认 300 秒 = 5 分钟）
   * @returns true 表示已过期或即将过期
   *
   * @example
   * ```typescript
   * const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
   * if (oauth.isTokenExpired(expiresAt)) {
   *   // 刷新 token
   *   const newToken = await oauth.refreshAccessToken(refreshToken);
   * }
   * ```
   */
  isTokenExpired(expiresAt: number, bufferSeconds = 300): boolean {
    const now = Date.now();
    const bufferMs = bufferSeconds * 1000;
    return expiresAt - bufferMs <= now;
  }

  /**
   * 通用的 token 请求方法
   *
   * @private
   */
  private async requestToken(body: Record<string, string>): Promise<OAuthTokenResponse> {
    try {
      const response = await this.http
        .post(this.config.tokenEndpoint, {
          form: body, // 使用 form-encoded 格式，符合 OAuth 2.0 RFC 6749 规范
          headers: {
            accept: 'application/json',
          },
          throwHttpErrors: false, // 手动处理错误
        })
        .json();
      // 检查是否是错误响应
      const errorResult = oauthErrorResponseSchema.safeParse(response);
      if (errorResult.success) {
        throw new OAuthError(
          errorResult.data.error_description || errorResult.data.error,
          errorResult.data.error,
          errorResult.data.error_description,
        );
      }

      // 验证成功响应
      const tokenResult = oauthTokenResponseSchema.safeParse(response);
      if (!tokenResult.success) {
        throw new OAuthError(
          `Invalid token response: ${tokenResult.error.message}`,
          'invalid_response',
        );
      }

      return tokenResult.data;
    } catch (error) {
      // 如果是 OAuthError，直接抛出
      if (error instanceof OAuthError) {
        throw error;
      }

      // 网络错误或其他错误
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new OAuthError(`Token request failed: ${message}`, 'request_failed');
    }
  }

  /**
   * 生成随机的 state 参数（用于 CSRF 保护）
   *
   * @private
   */
  private generateRandomState(): string {
    // 生成 32 字节的随机字符串
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
