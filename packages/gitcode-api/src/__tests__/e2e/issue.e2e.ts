/**
 * Issue 模块 E2E 测试
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
const TEST_REPO_URL = 'https://gitcode.com/xbghc/gitcode-demo';

describe.skipIf(!hasToken)('Issue 模块 E2E 测试', () => {
  let client: GitCodeClient;

  beforeAll(() => {
    client = new GitCodeClient(process.env.GITCODE_TOKEN);
  });

  beforeEach(async () => {
    await sleep(200); // 避免触发速率限制
  });

  describe('client.issue.list()', () => {
    it('应该获取真实的 Issue 列表', async () => {
      const issues = await client.issue.list(TEST_REPO_URL, { state: 'all' });

      // 验证返回的是数组，结构由 Zod schema 保证
      expect(Array.isArray(issues)).toBe(true);
    });

    it('应该支持状态过滤', async () => {
      const openIssues = await client.issue.list(TEST_REPO_URL, { state: 'open' });
      const closedIssues = await client.issue.list(TEST_REPO_URL, { state: 'closed' });

      expect(Array.isArray(openIssues)).toBe(true);
      expect(Array.isArray(closedIssues)).toBe(true);

      // 验证状态过滤正确（业务逻辑）
      openIssues.forEach((issue) => {
        expect(issue.state).toBe('open');
      });
      closedIssues.forEach((issue) => {
        expect(issue.state).toBe('closed');
      });
    });

    it('应该支持分页参数', async () => {
      const page1 = await client.issue.list(TEST_REPO_URL, {
        state: 'all',
        page: 1,
        per_page: 5,
      });

      expect(Array.isArray(page1)).toBe(true);
      expect(page1.length).toBeLessThanOrEqual(5);
    });
  });

  describe('client.issue.get()', () => {
    it('应该根据 number 获取 Issue 详情', async () => {
      // 先获取一个 Issue
      const issues = await client.issue.list(TEST_REPO_URL, { state: 'all' });

      if (issues.length === 0) {
        console.warn('⚠️ 测试仓库没有 Issue，跳过详情测试');
        return;
      }

      const issueNumber = Number(issues[0].number);
      const issue = await client.issue.get(TEST_REPO_URL, issueNumber);

      // 验证 Issue number 匹配（业务逻辑）
      expect(Number(issue.number)).toBe(issueNumber);
    });
  });

  describe('client.issue.comments()', () => {
    it('应该获取 Issue 的评论列表', async () => {
      const issues = await client.issue.list(TEST_REPO_URL, { state: 'all' });

      if (issues.length === 0) {
        console.warn('⚠️ 测试仓库没有 Issue，跳过评论测试');
        return;
      }

      const issueNumber = Number(issues[0].number);
      const comments = await client.issue.comments(TEST_REPO_URL, issueNumber);

      // 验证返回的是数组，结构由 Zod schema 保证
      expect(Array.isArray(comments)).toBe(true);
    });
  });
});
