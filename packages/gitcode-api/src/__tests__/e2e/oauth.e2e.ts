/**
 * OAuth 模块 E2E 测试
 *
 * 测试 refresh token 刷新功能，验证返回的 access_token 可用
 *
 * 运行方式:
 * GITCODE_OAUTH_CLIENT_ID=xxx \
 * GITCODE_OAUTH_CLIENT_SECRET=xxx \
 * GITCODE_OAUTH_REDIRECT_URI=xxx \
 * GITCODE_REFRESH_TOKEN=xxx \
 * pnpm test:run:e2e
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { OAuthClient } from '../../client/auth/oauth.js';
import { GitCodeClient } from '../../client/index.js';
import { sleep } from './helpers.js';

const hasOAuthConfig =
  !!process.env.GITCODE_OAUTH_CLIENT_ID &&
  !!process.env.GITCODE_OAUTH_CLIENT_SECRET &&
  !!process.env.GITCODE_OAUTH_REDIRECT_URI &&
  !!process.env.GITCODE_REFRESH_TOKEN;

describe.skipIf(!hasOAuthConfig)('OAuth 模块 E2E 测试', () => {
  let oauthClient: OAuthClient;

  beforeEach(async () => {
    oauthClient = new OAuthClient({
      clientId: process.env.GITCODE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GITCODE_OAUTH_CLIENT_SECRET!,
      redirectUri: process.env.GITCODE_OAUTH_REDIRECT_URI!,
    });
    await sleep(200); // 避免触发速率限制
  });

  describe('oauthClient.refreshAccessToken()', () => {
    it('应该刷新 token 并返回可用的 access_token', async () => {
      const refreshToken = process.env.GITCODE_REFRESH_TOKEN!;

      // 刷新 token
      const tokenResponse = await oauthClient.refreshAccessToken(refreshToken);

      // 验证响应包含必需字段
      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.access_token.length).toBeGreaterThan(0);
      expect(tokenResponse.token_type).toBe('bearer');
      expect(tokenResponse.expires_in).toBeGreaterThan(0);

      // 使用新的 access_token 创建客户端并验证可用性
      const client = new GitCodeClient(tokenResponse.access_token);
      const profile = await client.user.getProfile();

      // 验证能获取用户信息
      expect(profile.login).toBeDefined();
      expect(profile.login.length).toBeGreaterThan(0);
    });

    it('应该返回新的 refresh_token', async () => {
      const refreshToken = process.env.GITCODE_REFRESH_TOKEN!;

      const tokenResponse = await oauthClient.refreshAccessToken(refreshToken);

      // GitCode 应该返回新的 refresh_token
      expect(tokenResponse.refresh_token).toBeDefined();
      expect(tokenResponse.refresh_token.length).toBeGreaterThan(0);
    });
  });
});
