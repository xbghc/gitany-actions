import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitCodeClient } from '../../../client/core.js';
import { OAuthClient } from '../../../client/auth/oauth.js';
import { OAuthTokenExpiredError, type OAuthTokenResponse } from '../../../types/oauth.js';
import { createMockGot } from '../../mocks/http.mock.js';

describe('GitCodeClientAuth', () => {
  // 保存原始环境变量
  const originalEnv = process.env.GITCODE_TOKEN;

  beforeEach(() => {
    // 清除环境变量以确保测试隔离
    delete process.env.GITCODE_TOKEN;
  });

  afterEach(() => {
    // 恢复原始环境变量
    if (originalEnv !== undefined) {
      process.env.GITCODE_TOKEN = originalEnv;
    } else {
      delete process.env.GITCODE_TOKEN;
    }
  });

  describe('PAT 认证', () => {
    it('setToken() 应该设置 token', () => {
      const client = new GitCodeClient();

      client.auth.setToken('new-token');

      expect(client.auth.token()).toBe('new-token');
    });

    it('token() 应该返回当前 token', () => {
      const client = new GitCodeClient('test-token');

      expect(client.auth.token()).toBe('test-token');
    });

    it('token() 应该在未设置时返回 undefined', () => {
      const client = new GitCodeClient();

      expect(client.auth.token()).toBeUndefined();
    });

    it('isAuthenticated() 应该在有 token 时返回 true', () => {
      const client = new GitCodeClient('test-token');

      expect(client.auth.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated() 应该在无 token 时返回 false', () => {
      const client = new GitCodeClient();

      expect(client.auth.isAuthenticated()).toBe(false);
    });

    it('getAuthType() 应该在有 PAT 时返回 "token"', () => {
      const client = new GitCodeClient('test-token');

      expect(client.auth.getAuthType()).toBe('token');
    });

    it('getAuthType() 应该在无认证时返回 "none"', () => {
      const client = new GitCodeClient();

      expect(client.auth.getAuthType()).toBe('none');
    });
  });

  describe('环境变量', () => {
    it('应该从 GITCODE_TOKEN 环境变量读取 token', () => {
      process.env.GITCODE_TOKEN = 'env-token';

      const client = new GitCodeClient();

      expect(client.auth.token()).toBe('env-token');
    });

    it('构造函数参数应该优先于环境变量', () => {
      process.env.GITCODE_TOKEN = 'env-token';

      const client = new GitCodeClient('param-token');

      expect(client.auth.token()).toBe('param-token');
    });
  });

  describe('OAuth 配置', () => {
    it('configureOAuth() 应该创建 OAuthClient', () => {
      const client = new GitCodeClient();

      client.auth.configureOAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(client.auth.getOAuthClient()).toBeInstanceOf(OAuthClient);
    });

    it('getOAuthClient() 应该返回配置的客户端', () => {
      const client = new GitCodeClient();

      client.auth.configureOAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      const oauthClient = client.auth.getOAuthClient();

      expect(oauthClient).toBeDefined();
      expect(oauthClient).toBeInstanceOf(OAuthClient);
    });

    it('getOAuthClient() 应该在未配置时返回 undefined', () => {
      const client = new GitCodeClient('test-token');

      expect(client.auth.getOAuthClient()).toBeUndefined();
    });
  });

  describe('OAuth Token 管理', () => {
    const mockTokenResponse: OAuthTokenResponse = {
      access_token: 'oauth-access-token',
      refresh_token: 'oauth-refresh-token',
      expires_in: 3600, // 1 小时
      scope: 'user repo',
      token_type: 'bearer',
    };

    it('setOAuthToken() 应该保存 token 状态', () => {
      const client = new GitCodeClient();

      client.auth.setOAuthToken(mockTokenResponse);

      const state = client.auth.getOAuthState();
      expect(state).toBeDefined();
      expect(state?.accessToken).toBe('oauth-access-token');
      expect(state?.refreshToken).toBe('oauth-refresh-token');
    });

    it('setOAuthToken() 应该计算正确的 expiresAt', () => {
      const client = new GitCodeClient();
      const before = Date.now();

      client.auth.setOAuthToken(mockTokenResponse);

      const after = Date.now();
      const state = client.auth.getOAuthState();

      // expiresAt 应该在 before + 3600000 和 after + 3600000 之间
      expect(state?.expiresAt).toBeGreaterThanOrEqual(before + 3600000);
      expect(state?.expiresAt).toBeLessThanOrEqual(after + 3600000);
    });

    it('getOAuthState() 应该返回当前状态', () => {
      const client = new GitCodeClient();

      client.auth.setOAuthToken(mockTokenResponse);

      const state = client.auth.getOAuthState();
      expect(state?.scope).toBe('user repo');
      expect(state?.tokenType).toBe('bearer');
    });

    it('getOAuthState() 应该在未设置时返回 undefined', () => {
      const client = new GitCodeClient();

      expect(client.auth.getOAuthState()).toBeUndefined();
    });

    it('clearOAuthToken() 应该清除状态', () => {
      const client = new GitCodeClient();

      client.auth.setOAuthToken(mockTokenResponse);
      expect(client.auth.getOAuthState()).toBeDefined();

      client.auth.clearOAuthToken();
      expect(client.auth.getOAuthState()).toBeUndefined();
    });

    it('token() 应该在 OAuth 配置时优先返回 OAuth token', () => {
      const client = new GitCodeClient('pat-token');

      client.auth.setOAuthToken(mockTokenResponse);

      expect(client.auth.token()).toBe('oauth-access-token');
    });

    it('getAuthType() 应该在 OAuth 时返回 "oauth"', () => {
      const client = new GitCodeClient();

      client.auth.setOAuthToken(mockTokenResponse);

      expect(client.auth.getAuthType()).toBe('oauth');
    });

    it('isAuthenticated() 应该在有 OAuth token 时返回 true', () => {
      const client = new GitCodeClient();

      client.auth.setOAuthToken(mockTokenResponse);

      expect(client.auth.isAuthenticated()).toBe(true);
    });
  });

  describe('getValidToken() 异步方法', () => {
    it('应该返回 PAT token（无 OAuth）', async () => {
      const client = new GitCodeClient('pat-token');

      const token = await client.auth.getValidToken();

      expect(token).toBe('pat-token');
    });

    it('应该返回 OAuth access token（未过期）', async () => {
      const client = new GitCodeClient();
      createMockGot(); // Setup mock (result not used in this test)

      client.auth.configureOAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      // 设置一个未过期的 token（1 小时后过期）
      client.auth.setOAuthToken({
        access_token: 'oauth-access-token',
        refresh_token: 'oauth-refresh-token',
        expires_in: 3600,
        scope: 'user repo',
        token_type: 'bearer',
      });

      const token = await client.auth.getValidToken();

      expect(token).toBe('oauth-access-token');
    });

    it('应该在无认证时抛出错误', async () => {
      const client = new GitCodeClient();

      await expect(client.auth.getValidToken()).rejects.toThrow('No authentication configured');
    });

    it('应该在 OAuth 未配置客户端时抛出错误', async () => {
      const client = new GitCodeClient();

      // 手动设置 OAuth state 但不配置客户端
      // @ts-expect-error - 访问私有属性用于测试
      client.auth._oauthState = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000, // 已过期
        scope: 'user',
        tokenType: 'bearer',
      };

      await expect(client.auth.getValidToken()).rejects.toThrow('OAuth client not configured');
    });
  });

  describe('OAuth Token 自动刷新', () => {
    it('应该自动刷新过期的 OAuth token', async () => {
      const { mockGot } = createMockGot();

      // 创建一个 mock 的 OAuthClient 来测试刷新
      const mockRefreshResponse: OAuthTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        scope: 'user repo',
        token_type: 'bearer',
      };

      // 使用真实客户端但 mock refreshAccessToken
      const client = new GitCodeClient('test', mockGot);

      client.auth.configureOAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      // Mock OAuth client 的 refreshAccessToken 方法
      const oauthClient = client.auth.getOAuthClient()!;
      vi.spyOn(oauthClient, 'refreshAccessToken').mockResolvedValue(mockRefreshResponse);
      vi.spyOn(oauthClient, 'isTokenExpired').mockReturnValue(true);

      // 设置一个已过期的 token
      client.auth.setOAuthToken({
        access_token: 'old-access-token',
        refresh_token: 'old-refresh-token',
        expires_in: -1, // 负数使其立即过期
        scope: 'user repo',
        token_type: 'bearer',
      });

      const token = await client.auth.getValidToken();

      expect(token).toBe('new-access-token');
      expect(oauthClient.refreshAccessToken).toHaveBeenCalledWith('old-refresh-token');
    });

    it('应该在刷新失败时抛出 OAuthTokenExpiredError', async () => {
      const { mockGot } = createMockGot();

      const client = new GitCodeClient('test', mockGot);

      client.auth.configureOAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      // Mock OAuth client 刷新失败
      const oauthClient = client.auth.getOAuthClient()!;
      vi.spyOn(oauthClient, 'refreshAccessToken').mockRejectedValue(new Error('Refresh failed'));
      vi.spyOn(oauthClient, 'isTokenExpired').mockReturnValue(true);

      // 设置一个已过期的 token
      client.auth.setOAuthToken({
        access_token: 'old-access-token',
        refresh_token: 'old-refresh-token',
        expires_in: -1,
        scope: 'user repo',
        token_type: 'bearer',
      });

      await expect(client.auth.getValidToken()).rejects.toThrow(OAuthTokenExpiredError);
    });

    it('刷新失败后应该清除 OAuth 状态', async () => {
      const { mockGot } = createMockGot();

      const client = new GitCodeClient('test', mockGot);

      client.auth.configureOAuth({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      const oauthClient = client.auth.getOAuthClient()!;
      vi.spyOn(oauthClient, 'refreshAccessToken').mockRejectedValue(new Error('Refresh failed'));
      vi.spyOn(oauthClient, 'isTokenExpired').mockReturnValue(true);

      client.auth.setOAuthToken({
        access_token: 'old-access-token',
        refresh_token: 'old-refresh-token',
        expires_in: -1,
        scope: 'user repo',
        token_type: 'bearer',
      });

      try {
        await client.auth.getValidToken();
      } catch {
        // 期望抛出错误
      }

      // OAuth 状态应该被清除
      expect(client.auth.getOAuthState()).toBeUndefined();
    });
  });

  describe('认证优先级', () => {
    it('OAuth token 应该优先于 PAT', () => {
      const client = new GitCodeClient('pat-token');

      client.auth.setOAuthToken({
        access_token: 'oauth-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: 'user',
        token_type: 'bearer',
      });

      expect(client.auth.token()).toBe('oauth-token');
      expect(client.auth.getAuthType()).toBe('oauth');
    });

    it('清除 OAuth 后应该回退到 PAT', () => {
      const client = new GitCodeClient('pat-token');

      client.auth.setOAuthToken({
        access_token: 'oauth-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: 'user',
        token_type: 'bearer',
      });

      expect(client.auth.token()).toBe('oauth-token');

      client.auth.clearOAuthToken();

      expect(client.auth.token()).toBe('pat-token');
      expect(client.auth.getAuthType()).toBe('token');
    });
  });
});
