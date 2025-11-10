import { OAuthClient } from '@xbghc/gitcode-api';

/**
 * OAuth 服务
 * 封装 GitCode OAuth 2.0 认证逻辑
 */
export class OAuthService {
  private oauthClient: OAuthClient;

  constructor() {
    const clientId = process.env.GITCODE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GITCODE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GITCODE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Missing OAuth configuration: GITCODE_OAUTH_CLIENT_ID, GITCODE_OAUTH_CLIENT_SECRET, and GITCODE_OAUTH_REDIRECT_URI are required',
      );
    }

    this.oauthClient = new OAuthClient({
      clientId,
      clientSecret,
      redirectUri,
      defaultScope: ['user', 'repo', 'pull_requests', 'issues'],
    });
  }

  /**
   * 生成 OAuth 授权 URL
   * @returns 授权 URL 和 state 参数
   */
  getAuthorizationUrl() {
    return this.oauthClient.generateAuthorizationUrl();
  }

  /**
   * 使用授权码换取 access token
   * @param code - 用户授权后返回的授权码
   * @returns OAuth token 响应
   */
  async exchangeCodeForToken(code: string) {
    return await this.oauthClient.exchangeCodeForToken(code);
  }
}
