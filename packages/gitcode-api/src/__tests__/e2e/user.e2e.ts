/**
 * User 模块 E2E 测试
 *
 * 这些测试需要真实的 GITCODE_TOKEN 环境变量
 * 运行方式: GITCODE_TOKEN=xxx pnpm test:e2e
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GitCodeClient } from '../../client/index.js';
import { withRetry, waitIfRateLimited } from './helpers.js';

const hasToken = !!process.env.GITCODE_TOKEN;

describe.skipIf(!hasToken)('User 模块 E2E 测试', () => {
  let client: GitCodeClient;

  beforeAll(() => {
    client = new GitCodeClient(process.env.GITCODE_TOKEN);
  });

  beforeEach(async () => {
    await waitIfRateLimited(client);
  });

  describe('client.user.getProfile()', () => {
    it('应该获取当前用户资料', async () => {
      const profile = await withRetry(() => client.user.getProfile(), client);

      // 验证必需字段
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('login');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('avatar_url');
      expect(profile).toHaveProperty('created_at');

      // 验证类型
      expect(typeof profile.id).toBe('number');
      expect(typeof profile.login).toBe('string');
      expect(profile.login.length).toBeGreaterThan(0);

      // 验证 URL 格式
      expect(profile.avatar_url).toMatch(/^https?:\/\//);
    });
  });

  describe('client.user.getNamespace()', () => {
    it('应该获取用户命名空间信息', async () => {
      const namespace = await withRetry(() => client.user.getNamespace(), client);

      expect(namespace).toBeDefined();
      expect(typeof namespace).toBe('object');
      expect(namespace).toHaveProperty('path');
    });
  });
});
