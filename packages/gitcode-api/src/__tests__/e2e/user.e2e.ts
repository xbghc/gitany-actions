/**
 * User 模块 E2E 测试
 *
 * 这些测试需要真实的 GITCODE_TOKEN 环境变量
 * 运行方式: GITCODE_TOKEN=xxx pnpm test:e2e
 *
 * 测试哲学：
 * - Zod schema 已验证所有类型和必需字段
 * - 测试专注于业务逻辑、过滤器行为和数据约束
 * - 如果 API 返回结构错误，Zod 会直接抛出 ZodError
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GitCodeClient } from '../../client/index.js';
import { sleep } from './helpers.js';

const hasToken = !!process.env.GITCODE_TOKEN;

describe.skipIf(!hasToken)('User 模块 E2E 测试', () => {
  let client: GitCodeClient;

  beforeAll(() => {
    client = new GitCodeClient(process.env.GITCODE_TOKEN);
  });

  beforeEach(async () => {
    await sleep(200); // 避免触发速率限制
  });

  describe('client.user.getProfile()', () => {
    it('应该获取当前用户资料', async () => {
      const profile = await client.user.getProfile();

      // 验证用户名非空（业务规则）
      expect(profile.login.length).toBeGreaterThan(0);

      // 验证 URL 格式正确（数据格式验证）
      expect(profile.avatar_url).toMatch(/^https?:\/\//);
    });
  });
});
