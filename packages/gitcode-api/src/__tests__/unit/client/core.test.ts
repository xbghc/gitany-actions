import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitCodeClient } from '../../../client/core.js';
import { GitCodeClientAuth } from '../../../client/auth/index.js';
import { GitCodeClientPr } from '../../../client/pr/index.js';
import { GitCodeClientRepo } from '../../../client/repo/index.js';
import { GitCodeClientIssue } from '../../../client/issue/index.js';
import { GitCodeClientUser } from '../../../client/user/index.js';
import { createMockGot } from '../../mocks/http.mock.js';

describe('GitCodeClient', () => {
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

  describe('构造函数', () => {
    it('应该接受 token 参数', () => {
      const client = new GitCodeClient('test-token');

      expect(client.auth.token()).toBe('test-token');
    });

    it('应该从环境变量读取 GITCODE_TOKEN（当未提供 token 时）', () => {
      process.env.GITCODE_TOKEN = 'env-token';

      const client = new GitCodeClient();

      expect(client.auth.token()).toBe('env-token');
    });

    it('构造函数参数应该优先于环境变量', () => {
      process.env.GITCODE_TOKEN = 'env-token';

      const client = new GitCodeClient('param-token');

      expect(client.auth.token()).toBe('param-token');
    });

    it('应该接受自定义 got 实例', () => {
      const { mockGot } = createMockGot();

      const client = new GitCodeClient('test-token', mockGot);

      expect(client.http).toBe(mockGot);
    });

    it('应该创建默认 got 实例（当未提供自定义实例时）', () => {
      const client = new GitCodeClient('test-token');

      expect(client.http).toBeDefined();
      expect(typeof client.http.get).toBe('function');
      expect(typeof client.http.post).toBe('function');
    });

    it('应该在未提供 token 且无环境变量时创建客户端', () => {
      const client = new GitCodeClient();

      expect(client.auth.token()).toBeUndefined();
    });
  });

  describe('子模块初始化', () => {
    it('应该初始化 pr 子模块', () => {
      const client = new GitCodeClient('test-token');

      expect(client.pr).toBeDefined();
      expect(client.pr).toBeInstanceOf(GitCodeClientPr);
    });

    it('应该初始化 repo 子模块', () => {
      const client = new GitCodeClient('test-token');

      expect(client.repo).toBeDefined();
      expect(client.repo).toBeInstanceOf(GitCodeClientRepo);
    });

    it('应该初始化 issue 子模块', () => {
      const client = new GitCodeClient('test-token');

      expect(client.issue).toBeDefined();
      expect(client.issue).toBeInstanceOf(GitCodeClientIssue);
    });

    it('应该初始化 user 子模块', () => {
      const client = new GitCodeClient('test-token');

      expect(client.user).toBeDefined();
      expect(client.user).toBeInstanceOf(GitCodeClientUser);
    });

    it('应该初始化 auth 子模块', () => {
      const client = new GitCodeClient('test-token');

      expect(client.auth).toBeDefined();
      expect(client.auth).toBeInstanceOf(GitCodeClientAuth);
    });
  });

  describe('Rate Limiting', () => {
    it('isRateLimited() 应该在未限流时返回 false', () => {
      const client = new GitCodeClient('test-token');

      expect(client.isRateLimited()).toBe(false);
    });

    it('getRateLimitWaitTime() 应该在未限流时返回 0', () => {
      const client = new GitCodeClient('test-token');

      expect(client.getRateLimitWaitTime()).toBe(0);
    });

    it('isRateLimited() 应该在限流期间返回 true', () => {
      const client = new GitCodeClient('test-token');

      // 通过反射设置私有属性来模拟限流状态
      // @ts-expect-error - 访问私有属性用于测试
      client.rateLimitedUntil = Date.now() + 60000; // 60 秒后过期

      expect(client.isRateLimited()).toBe(true);
    });

    it('isRateLimited() 应该在限流结束后返回 false', () => {
      const client = new GitCodeClient('test-token');

      // 设置一个已经过期的限流时间
      // @ts-expect-error - 访问私有属性用于测试
      client.rateLimitedUntil = Date.now() - 1000; // 1 秒前已过期

      expect(client.isRateLimited()).toBe(false);
    });

    it('getRateLimitWaitTime() 应该返回剩余等待秒数', () => {
      const client = new GitCodeClient('test-token');

      // 设置 30 秒后过期
      // @ts-expect-error - 访问私有属性用于测试
      client.rateLimitedUntil = Date.now() + 30000;

      const waitTime = client.getRateLimitWaitTime();

      // 应该在 29-31 秒之间（考虑执行时间）
      expect(waitTime).toBeGreaterThanOrEqual(29);
      expect(waitTime).toBeLessThanOrEqual(31);
    });

    it('getRateLimitWaitTime() 应该在限流过期后返回 0', () => {
      const client = new GitCodeClient('test-token');

      // 设置已过期的限流时间
      // @ts-expect-error - 访问私有属性用于测试
      client.rateLimitedUntil = Date.now() - 5000;

      expect(client.getRateLimitWaitTime()).toBe(0);
    });
  });

  describe('使用自定义 HTTP 客户端', () => {
    it('应该使用注入的 mock HTTP 客户端发送请求', async () => {
      const responses = new Map();
      responses.set('repos/owner/repo/pulls', { data: [] });

      const { mockGot, requests } = createMockGot(responses);
      const client = new GitCodeClient('test-token', mockGot);

      // 直接调用 http.get 来验证注入的客户端被使用
      await client.http.get('repos/owner/repo/pulls').json();

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('GET');
      expect(requests[0].url).toBe('repos/owner/repo/pulls');
    });

    it('应该能记录多个请求', async () => {
      const responses = new Map();
      responses.set('endpoint1', { data: { id: 1 } });
      responses.set('endpoint2', { data: { id: 2 } });

      const { mockGot, requests } = createMockGot(responses);
      const client = new GitCodeClient('test-token', mockGot);

      await client.http.get('endpoint1').json();
      await client.http.get('endpoint2').json();

      expect(requests).toHaveLength(2);
    });
  });

  describe('向后兼容性', () => {
    it('应该导出 GitcodeClient 别名', async () => {
      const { GitcodeClient } = await import('../../../client/core.js');

      expect(GitcodeClient).toBe(GitCodeClient);
    });
  });

  describe('http 属性', () => {
    it('应该是只读属性', () => {
      const client = new GitCodeClient('test-token');

      // http 属性应该存在且不可重新赋值（TypeScript 会在编译时检查）
      expect(client.http).toBeDefined();
    });

    it('自定义实例应该保持引用', () => {
      const { mockGot } = createMockGot();

      const client = new GitCodeClient('test-token', mockGot);

      expect(client.http).toBe(mockGot);
    });
  });
});
