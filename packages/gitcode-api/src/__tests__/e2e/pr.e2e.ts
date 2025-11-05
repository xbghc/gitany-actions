/**
 * PR 模块 E2E 测试
 *
 * 这些测试需要真实的 GITCODE_TOKEN 环境变量
 * 运行方式: GITCODE_TOKEN=xxx pnpm test:e2e
 *
 * 测试哲学：
 * - Zod schema 已验证所有类型和必需字段
 * - 测试专注于业务逻辑、过滤器行为和数据约束
 * - 如果 API 返回结构错误，Zod 会直接抛出 ZodError
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GitCodeClient } from '../../client/index.js';
import { waitIfRateLimited, withRetry } from './helpers.js';

const hasToken = !!process.env.GITCODE_TOKEN;

// 使用真实的测试仓库（需要预先创建）
const TEST_REPO_URL = 'https://gitcode.com/xbghc/gitcode-actions';

describe.skipIf(!hasToken)('PR 模块 E2E 测试', () => {
  let client: GitCodeClient;

  beforeAll(() => {
    client = new GitCodeClient(process.env.GITCODE_TOKEN);
  });

  beforeEach(async () => {
    await waitIfRateLimited(client);
  });

  describe('client.pr.list()', () => {
    it('应该获取真实的 PR 列表', async () => {
      const prs = await withRetry(() => client.pr.list(TEST_REPO_URL, { state: 'all' }), client);

      // 验证返回的是数组
      expect(Array.isArray(prs)).toBe(true);

      // 如果有 PR，Zod schema 已验证结构完整性
      // 这里无需重复检查 toHaveProperty
    });

    it('应该支持状态过滤', async () => {
      const openPrs = await withRetry(
        () => client.pr.list(TEST_REPO_URL, { state: 'open' }),
        client,
      );
      const closedPrs = await withRetry(
        () => client.pr.list(TEST_REPO_URL, { state: 'closed' }),
        client,
      );

      expect(Array.isArray(openPrs)).toBe(true);
      expect(Array.isArray(closedPrs)).toBe(true);

      // 验证状态过滤正确
      openPrs.forEach((pr) => {
        expect(pr.state).toBe('open');
      });
      closedPrs.forEach((pr) => {
        expect(['closed', 'merged']).toContain(pr.state);
      });
    });

    it('应该支持分页参数', async () => {
      const page1 = await withRetry(
        () =>
          client.pr.list(TEST_REPO_URL, {
            state: 'all',
            page: 1,
            per_page: 5,
          }),
        client,
      );

      expect(Array.isArray(page1)).toBe(true);
      expect(page1.length).toBeLessThanOrEqual(5);
    });
  });

  describe('client.pr.count()', () => {
    it('应该返回 PR 数量统计', async () => {
      const count = await withRetry(() => client.pr.count(TEST_REPO_URL), client);

      // 验证数量统计逻辑正确（业务规则）
      expect(count.opened).toBeGreaterThanOrEqual(0);
      expect(count.closed).toBeGreaterThanOrEqual(0);
      expect(count.all).toBeGreaterThanOrEqual(count.opened + count.closed);
    });
  });

  describe('client.pr.comments()', () => {
    it('应该获取 PR 的评论列表', async () => {
      // 首先获取一个 PR
      const prs = await withRetry(() => client.pr.list(TEST_REPO_URL, { state: 'all' }), client);

      if (prs.length === 0) {
        console.warn('⚠️ 测试仓库没有 PR，跳过评论测试');
        return;
      }

      const prNumber = prs[0].number;
      const comments = await withRetry(() => client.pr.comments(TEST_REPO_URL, prNumber), client);

      // 验证返回的是数组，结构由 Zod schema 保证
      expect(Array.isArray(comments)).toBe(true);
    });
  });
});

describe.skipIf(hasToken)('E2E 测试跳过提示', () => {
  it('需要 GITCODE_TOKEN 环境变量', () => {
    console.log('ℹ️ E2E 测试已跳过：缺少 GITCODE_TOKEN 环境变量');
    console.log('运行方式: GITCODE_TOKEN=xxx pnpm test:e2e');
  });
});
