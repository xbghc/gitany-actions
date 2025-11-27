/**
 * Repo 模块 E2E 测试
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
import { parseGitUrl } from '../../utils/index.js';
import { sleep } from './helpers.js';

const hasToken = !!process.env.GITCODE_TOKEN;
const TEST_REPO_URL = 'https://gitcode.com/xbghc/gitcode-demo';

describe.skipIf(!hasToken)('Repo 模块 E2E 测试', () => {
  let client: GitCodeClient;
  let owner: string;
  let repo: string;

  beforeAll(() => {
    client = new GitCodeClient(process.env.GITCODE_TOKEN);
    const parsed = parseGitUrl(TEST_REPO_URL);
    if (!parsed) throw new Error('Invalid test repo URL');
    owner = parsed.owner;
    repo = parsed.repo;
  });

  beforeEach(async () => {
    await sleep(200); // 避免触发速率限制
  });

  describe('client.repo.getSettings()', () => {
    it('应该获取仓库设置', async () => {
      const settings = await client.repo.getSettings(owner, repo);

      // 结构由 Zod schema 保证，这里仅验证调用成功
      expect(settings).toBeDefined();
    });
  });

  describe('client.repo.getBranches()', () => {
    it('应该获取所有分支列表', async () => {
      const branches = await client.repo.getBranches(owner, repo);

      expect(Array.isArray(branches)).toBe(true);
      expect(branches.length).toBeGreaterThan(0); // 业务规则：仓库至少有一个分支
    });
  });

  describe('client.repo.getBranch()', () => {
    it('应该获取指定分支详情', async () => {
      const branch = await client.repo.getBranch(owner, repo, 'main');

      // 验证获取的分支名称正确（业务逻辑）
      expect(branch.name).toBe('main');
    });
  });

  describe('client.repo.getCommits()', () => {
    it('应该获取提交历史', async () => {
      const commits = await client.repo.getCommits(owner, repo);

      expect(Array.isArray(commits)).toBe(true);
      expect(commits.length).toBeGreaterThan(0); // 业务规则：仓库至少有一次提交
    });
  });

  describe('client.repo.getContributors()', () => {
    it('应该获取贡献者列表', async () => {
      const contributors = await client.repo.getContributors(owner, repo);

      // 验证返回的是数组，结构由 Zod schema 保证
      expect(Array.isArray(contributors)).toBe(true);
    });
  });

  describe('client.repo.getSelfRepoPermission()', () => {
    it('应该获取当前用户的仓库权限', async () => {
      const permission = await client.repo.getSelfRepoPermission(TEST_REPO_URL);

      // 结构由 Zod schema 保证，这里仅验证调用成功
      expect(permission).toBeDefined();
    });
  });

  describe('client.repo.getSelfRepoPermissionRole()', () => {
    it('应该提取用户角色', async () => {
      const role = await client.repo.getSelfRepoPermissionRole(TEST_REPO_URL);

      // 验证用户角色在合法范围内（业务规则）
      expect(['owner', 'admin', 'write', 'read']).toContain(role);
    });
  });

  describe('client.repo.getNotifications()', () => {
    it('应该获取通知列表', async () => {
      const notifications = await client.repo.getNotifications(owner, repo);

      // 验证返回的是数组，结构由 Zod schema 保证
      expect(Array.isArray(notifications.list)).toBe(true);
    });

    it('应该支持 unread 参数过滤', async () => {
      const unreadNotifications = await client.repo.getNotifications(owner, repo, { unread: true });

      expect(Array.isArray(unreadNotifications.list)).toBe(true);

      // 验证未读过滤器生效（业务逻辑）
      unreadNotifications.list.forEach((notification) => {
        expect(notification.unread).toBe(true);
      });
    });
  });
});
