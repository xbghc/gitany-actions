import { describe, it, expect, vi } from 'vitest';
import type { Got } from 'got';
import { OAuthClient } from '../../../client/auth/oauth.js';
import { OAuthError, type OAuthConfig } from '../../../types/oauth.js';

// Cast mock HTTP client to Got for testing
const asMockGot = (mock: { post: ReturnType<typeof vi.fn> }): Got => mock as unknown as Got;

describe('OAuthClient', () => {
  const defaultConfig: OAuthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
  };

  describe('构造函数', () => {
    it('应该使用默认端点', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { url } = oauth.generateAuthorizationUrl();

      expect(url).toContain('https://gitcode.com/oauth/authorize');
    });

    it('应该允许自定义授权端点', () => {
      const oauth = new OAuthClient({
        ...defaultConfig,
        authorizationEndpoint: 'https://custom.example.com/oauth/authorize',
      });

      const { url } = oauth.generateAuthorizationUrl();

      expect(url).toContain('https://custom.example.com/oauth/authorize');
    });

    it('应该使用默认 scope', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { url } = oauth.generateAuthorizationUrl();

      expect(url).toContain('scope=user+repo');
    });

    it('应该允许自定义默认 scope', () => {
      const oauth = new OAuthClient({
        ...defaultConfig,
        defaultScope: ['user', 'projects', 'pull_requests'],
      });

      const { url } = oauth.generateAuthorizationUrl();

      expect(url).toContain('scope=user+projects+pull_requests');
    });

    it('应该接受自定义 HTTP 客户端', () => {
      const mockHttp = {
        post: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue({}),
        }),
      };

      // 不应该抛出错误
      expect(() => new OAuthClient(defaultConfig, asMockGot(mockHttp))).not.toThrow();
    });
  });

  describe('generateAuthorizationUrl()', () => {
    it('应该生成正确的授权 URL', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { url } = oauth.generateAuthorizationUrl();

      expect(url).toMatch(/^https:\/\/gitcode\.com\/oauth\/authorize\?/);
    });

    it('应该包含 client_id 参数', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { url } = oauth.generateAuthorizationUrl();

      expect(url).toContain('client_id=test-client-id');
    });

    it('应该包含 redirect_uri 参数', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { url } = oauth.generateAuthorizationUrl();

      // URL 编码后的 redirect_uri
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
    });

    it('应该包含 response_type=code', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { url } = oauth.generateAuthorizationUrl();

      expect(url).toContain('response_type=code');
    });

    it('应该包含 scope 参数', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { url } = oauth.generateAuthorizationUrl({ scope: ['user', 'repo', 'projects'] });

      expect(url).toContain('scope=user+repo+projects');
    });

    it('应该生成随机 state（未提供时）', () => {
      const oauth = new OAuthClient(defaultConfig);

      const result1 = oauth.generateAuthorizationUrl();
      const result2 = oauth.generateAuthorizationUrl();

      expect(result1.state).toBeDefined();
      expect(result2.state).toBeDefined();
      expect(result1.state).not.toBe(result2.state);
    });

    it('应该使用提供的 state', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { url, state } = oauth.generateAuthorizationUrl({ state: 'custom-state-value' });

      expect(state).toBe('custom-state-value');
      expect(url).toContain('state=custom-state-value');
    });

    it('应该返回 { url, state } 对象', () => {
      const oauth = new OAuthClient(defaultConfig);

      const result = oauth.generateAuthorizationUrl();

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('state');
      expect(typeof result.url).toBe('string');
      expect(typeof result.state).toBe('string');
    });

    it('state 应该是 64 字符的十六进制字符串', () => {
      const oauth = new OAuthClient(defaultConfig);

      const { state } = oauth.generateAuthorizationUrl();

      // 32 字节 = 64 个十六进制字符
      expect(state).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('exchangeCodeForToken()', () => {
    it('应该发送正确的 token 请求', async () => {
      const mockPost = vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          scope: 'user repo',
          token_type: 'bearer',
        }),
      });

      const mockHttp = { post: mockPost };
      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      await oauth.exchangeCodeForToken('test-code');

      expect(mockPost).toHaveBeenCalledWith(
        'https://gitcode.com/oauth/token',
        expect.objectContaining({
          form: {
            grant_type: 'authorization_code',
            code: 'test-code',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
            redirect_uri: 'http://localhost:3000/callback',
          },
        }),
      );
    });

    it('应该返回解析后的 token 响应', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        scope: 'user repo',
        token_type: 'bearer',
      };

      const mockHttp = {
        post: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue(mockResponse),
        }),
      };

      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      const result = await oauth.exchangeCodeForToken('test-code');

      expect(result).toEqual(mockResponse);
    });

    it('应该在 OAuth 错误响应时抛出 OAuthError', async () => {
      const mockHttp = {
        post: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue({
            error: 'invalid_grant',
            error_description: 'The authorization code has expired',
          }),
        }),
      };

      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      await expect(oauth.exchangeCodeForToken('invalid-code')).rejects.toThrow(OAuthError);
    });

    it('OAuth 错误应该包含正确的 error code', async () => {
      const mockHttp = {
        post: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue({
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
          }),
        }),
      };

      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      try {
        await oauth.exchangeCodeForToken('test-code');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(OAuthError);
        expect((error as OAuthError).code).toBe('invalid_client');
      }
    });

    it('应该在响应格式无效时抛出 OAuthError', async () => {
      const mockHttp = {
        post: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue({
            // 缺少必需字段
            access_token: 'token',
            // 缺少 refresh_token, expires_in, scope
          }),
        }),
      };

      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      await expect(oauth.exchangeCodeForToken('test-code')).rejects.toThrow(OAuthError);
    });

    it('应该在网络错误时抛出 OAuthError', async () => {
      const mockHttp = {
        post: vi.fn().mockReturnValue({
          json: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      };

      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      await expect(oauth.exchangeCodeForToken('test-code')).rejects.toThrow(OAuthError);
    });
  });

  describe('refreshAccessToken()', () => {
    it('应该发送正确的刷新请求', async () => {
      const mockPost = vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          scope: 'user repo',
          token_type: 'bearer',
        }),
      });

      const mockHttp = { post: mockPost };
      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      await oauth.refreshAccessToken('old-refresh-token');

      expect(mockPost).toHaveBeenCalledWith(
        'https://gitcode.com/oauth/token',
        expect.objectContaining({
          form: {
            grant_type: 'refresh_token',
            refresh_token: 'old-refresh-token',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
          },
        }),
      );
    });

    it('应该返回新的 token', async () => {
      const newTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        scope: 'user repo',
        token_type: 'bearer',
      };

      const mockHttp = {
        post: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue(newTokenResponse),
        }),
      };

      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      const result = await oauth.refreshAccessToken('old-refresh-token');

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
    });

    it('应该在刷新失败时抛出 OAuthError', async () => {
      const mockHttp = {
        post: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue({
            error: 'invalid_grant',
            error_description: 'The refresh token has expired',
          }),
        }),
      };

      const oauth = new OAuthClient(defaultConfig, asMockGot(mockHttp));

      await expect(oauth.refreshAccessToken('expired-refresh-token')).rejects.toThrow(OAuthError);
    });
  });

  describe('isTokenExpired()', () => {
    it('应该在 token 已过期时返回 true', () => {
      const oauth = new OAuthClient(defaultConfig);

      // 过去的时间
      const expiredAt = Date.now() - 10000;

      expect(oauth.isTokenExpired(expiredAt)).toBe(true);
    });

    it('应该在 token 即将过期（5分钟内）时返回 true', () => {
      const oauth = new OAuthClient(defaultConfig);

      // 4 分钟后过期（小于默认 5 分钟 buffer）
      const expiredAt = Date.now() + 4 * 60 * 1000;

      expect(oauth.isTokenExpired(expiredAt)).toBe(true);
    });

    it('应该在 token 有效时返回 false', () => {
      const oauth = new OAuthClient(defaultConfig);

      // 1 小时后过期
      const expiredAt = Date.now() + 60 * 60 * 1000;

      expect(oauth.isTokenExpired(expiredAt)).toBe(false);
    });

    it('应该支持自定义 buffer 秒数', () => {
      const oauth = new OAuthClient(defaultConfig);

      // 3 分钟后过期
      const expiredAt = Date.now() + 3 * 60 * 1000;

      // 使用 2 分钟 buffer - 应该返回 false（还有 3 分钟）
      expect(oauth.isTokenExpired(expiredAt, 120)).toBe(false);

      // 使用 5 分钟 buffer - 应该返回 true（小于 5 分钟）
      expect(oauth.isTokenExpired(expiredAt, 300)).toBe(true);
    });

    it('应该在刚好过期边界返回 true', () => {
      const oauth = new OAuthClient(defaultConfig);

      // 刚好 5 分钟后过期（等于 buffer）
      const expiredAt = Date.now() + 300 * 1000;

      expect(oauth.isTokenExpired(expiredAt, 300)).toBe(true);
    });

    it('应该在 buffer 为 0 时只检查实际过期', () => {
      const oauth = new OAuthClient(defaultConfig);

      // 1 秒后过期
      const expiredAt = Date.now() + 1000;

      expect(oauth.isTokenExpired(expiredAt, 0)).toBe(false);
    });
  });

  describe('OAuthError 类', () => {
    it('应该是 Error 的实例', () => {
      const error = new OAuthError('Test error', 'test_error');

      expect(error).toBeInstanceOf(Error);
    });

    it('应该有正确的 name', () => {
      const error = new OAuthError('Test error', 'test_error');

      expect(error.name).toBe('OAuthError');
    });

    it('应该保存 code 和 description', () => {
      const error = new OAuthError('Test error', 'test_error', 'Detailed description');

      expect(error.code).toBe('test_error');
      expect(error.description).toBe('Detailed description');
    });

    it('description 应该是可选的', () => {
      const error = new OAuthError('Test error', 'test_error');

      expect(error.description).toBeUndefined();
    });
  });
});
