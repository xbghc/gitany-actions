/**
 * Issue 写操作 E2E 测试
 *
 * 这些测试会在真实的 GitCode 仓库中创建 Issue
 * 测试完成后会自动关闭创建的资源
 *
 * 运行前提：
 * - 设置 GITCODE_TOKEN 环境变量
 * - 设置 GITCODE_TEST_WRITE_REPO_URL 环境变量
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { parseGitUrl } from '../../../utils/index.js';
import type { GitCodeClient } from '../../../client/core.js';
import {
  TEST_WRITE_REPO_URL,
  skipIfNoWriteAccess,
  createTestClient,
  generateTestIdentifier,
  withRetry,
  sleep,
} from './setup.js';

describe.skipIf(skipIfNoWriteAccess())('Issue 写操作 E2E 测试', () => {
  let client: GitCodeClient;
  let owner: string;
  let repo: string;
  let createdIssueNumber: number | null = null;
  let createdCommentId: number | null = null;

  beforeAll(() => {
    client = createTestClient();

    // 解析仓库 URL
    const parsed = parseGitUrl(TEST_WRITE_REPO_URL);
    if (!parsed) {
      throw new Error(`Invalid test repo URL: ${TEST_WRITE_REPO_URL}`);
    }
    owner = parsed.owner;
    repo = parsed.repo;

    console.log(`Using test repo: ${owner}/${repo}`);
  });

  beforeEach(async () => {
    // 避免触发速率限制
    await sleep(500);
  });

  afterAll(async () => {
    // 清理：关闭测试创建的 Issue
    if (createdIssueNumber && client) {
      try {
        console.log(`Cleaning up: closing Issue #${createdIssueNumber}`);
        await withRetry(() =>
          client.issue.update(TEST_WRITE_REPO_URL, createdIssueNumber!, {
            state: 'closed',
          }),
        );
        console.log(`Issue #${createdIssueNumber} closed successfully`);
      } catch (error) {
        console.warn(`Failed to cleanup Issue #${createdIssueNumber}:`, error);
      }
    }
  });

  describe('client.issue.create()', () => {
    it('应该创建新的 Issue', async () => {
      const testId = generateTestIdentifier();
      const title = `${testId} - Test Issue`;
      const body = 'This is a test issue created by E2E tests.\n\nPlease ignore.';

      const issue = await withRetry(() =>
        client.issue.create({
          owner,
          body: {
            repo,
            title,
            body,
          },
        }),
      );

      expect(issue).toBeDefined();
      expect(issue.title).toBe(title);
      expect(issue.number).toBeDefined();

      // 保存创建的 Issue number 用于后续测试和清理
      createdIssueNumber = parseInt(String(issue.number), 10);
      console.log(`Created Issue #${createdIssueNumber}`);
    });
  });

  describe('client.issue.get()', () => {
    it('应该获取创建的 Issue', async () => {
      if (!createdIssueNumber) {
        console.log('Skipping: No issue was created');
        return;
      }

      const issue = await withRetry(() =>
        client.issue.get(TEST_WRITE_REPO_URL, createdIssueNumber!),
      );

      expect(issue).toBeDefined();
      expect(parseInt(String(issue.number), 10)).toBe(createdIssueNumber);
      expect(issue.state).toBe('open');
    });
  });

  describe('client.issue.update()', () => {
    it('应该更新 Issue 标题', async () => {
      if (!createdIssueNumber) {
        console.log('Skipping: No issue was created');
        return;
      }

      const newTitle = `${generateTestIdentifier()} - Updated Title`;

      const updated = await withRetry(() =>
        client.issue.update(TEST_WRITE_REPO_URL, createdIssueNumber!, {
          title: newTitle,
        }),
      );

      expect(updated).toBeDefined();
      expect(updated.title).toBe(newTitle);
    });

    it('应该更新 Issue 内容', async () => {
      if (!createdIssueNumber) {
        console.log('Skipping: No issue was created');
        return;
      }

      const newBody = 'Updated body content from E2E tests.';

      const updated = await withRetry(() =>
        client.issue.update(TEST_WRITE_REPO_URL, createdIssueNumber!, {
          body: newBody,
        }),
      );

      expect(updated).toBeDefined();
      expect(updated.body).toBe(newBody);
    });
  });

  describe('client.issue.createComment()', () => {
    it('应该在 Issue 上创建评论', async () => {
      if (!createdIssueNumber) {
        console.log('Skipping: No issue was created');
        return;
      }

      const commentBody = `${generateTestIdentifier()}\n\nTest comment from E2E tests.`;

      const comment = await withRetry(() =>
        client.issue.createComment({
          owner,
          repo,
          number: createdIssueNumber!,
          body: { body: commentBody },
        }),
      );

      expect(comment).toBeDefined();
      expect(comment.id).toBeDefined();
      expect(comment.body).toBe(commentBody);

      createdCommentId = comment.id;
      console.log(`Created comment #${createdCommentId}`);
    });
  });

  describe('client.issue.comments()', () => {
    it('应该获取 Issue 的评论列表', async () => {
      if (!createdIssueNumber) {
        console.log('Skipping: No issue was created');
        return;
      }

      const comments = await withRetry(() =>
        client.issue.comments(TEST_WRITE_REPO_URL, createdIssueNumber!),
      );

      expect(comments).toBeDefined();
      expect(Array.isArray(comments)).toBe(true);

      // 如果我们创建了评论，应该能在列表中找到
      if (createdCommentId) {
        const found = comments.some((c) => c.id === createdCommentId);
        expect(found).toBe(true);
      }
    });
  });

  describe('client.issue.updateComment()', () => {
    it('应该更新评论内容', async () => {
      if (!createdIssueNumber || !createdCommentId) {
        console.log('Skipping: No issue or comment was created');
        return;
      }

      const updatedBody = `${generateTestIdentifier()}\n\nUpdated comment from E2E tests.`;

      // API 返回空响应，只需确保不抛出错误
      await withRetry(() =>
        client.issue.updateComment({
          owner,
          repo,
          id: createdCommentId!,
          body: { body: updatedBody },
        }),
      );
    });
  });

  describe('Issue 生命周期', () => {
    it('应该关闭然后重新打开 Issue', async () => {
      if (!createdIssueNumber) {
        console.log('Skipping: No issue was created');
        return;
      }

      // 关闭 Issue
      const closed = await withRetry(() =>
        client.issue.update(TEST_WRITE_REPO_URL, createdIssueNumber!, {
          state: 'closed',
        }),
      );
      expect(closed.state).toBe('closed');

      // 等待一下确保状态更新
      await sleep(1000);

      // 重新打开 Issue
      const reopened = await withRetry(() =>
        client.issue.update(TEST_WRITE_REPO_URL, createdIssueNumber!, {
          state: 'open',
        }),
      );
      expect(reopened.state).toBe('open');
    });
  });
});
