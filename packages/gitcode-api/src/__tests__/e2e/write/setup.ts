/**
 * E2E 写操作测试配置
 *
 * 设置步骤：
 * 1. 在 GitCode 上创建专门的测试仓库（如 xbghc/gitcode-api-test）
 * 2. 设置环境变量 GITCODE_TEST_WRITE_REPO_URL
 * 3. 确保 GITCODE_TOKEN 有该仓库的写权限
 *
 * 注意事项：
 * - 测试会在仓库中创建 Issue 和 PR
 * - 测试完成后会自动关闭创建的资源
 * - 建议使用专门的测试仓库，避免污染生产数据
 */

import { GitCodeClient } from '../../../index.js';

/**
 * 测试仓库 URL
 *
 * 设置环境变量 GITCODE_TEST_WRITE_REPO_URL 来指定测试仓库
 * 默认使用公共测试仓库（可能需要根据实际情况修改）
 */
export const TEST_WRITE_REPO_URL =
  process.env.GITCODE_TEST_WRITE_REPO_URL || 'https://gitcode.com/xbghc/gitcode-api-test';

/**
 * GitCode Token
 */
export const GITCODE_TOKEN = process.env.GITCODE_TOKEN;

/**
 * 检查是否可以运行写操作测试
 *
 * 需要同时满足：
 * 1. 有 GITCODE_TOKEN
 * 2. 有 GITCODE_TEST_WRITE_REPO_URL
 *
 * @returns true 表示可以运行写操作测试
 */
export function canRunWriteTests(): boolean {
  return !!(GITCODE_TOKEN && process.env.GITCODE_TEST_WRITE_REPO_URL);
}

/**
 * 用于 describe.skipIf 的辅助函数
 *
 * @returns true 表示应该跳过测试
 */
export function skipIfNoWriteAccess(): boolean {
  if (!canRunWriteTests()) {
    console.log('跳过写操作测试：需要设置 GITCODE_TOKEN 和 GITCODE_TEST_WRITE_REPO_URL 环境变量');
    return true;
  }
  return false;
}

/**
 * 创建测试客户端
 *
 * @returns GitCodeClient 实例
 */
export function createTestClient(): GitCodeClient {
  if (!GITCODE_TOKEN) {
    throw new Error('GITCODE_TOKEN is required for E2E tests');
  }
  return new GitCodeClient(GITCODE_TOKEN);
}

/**
 * 生成唯一的测试标识符
 *
 * 用于标记测试创建的资源，便于识别和清理
 *
 * @returns 格式为 "[E2E Test] YYYY-MM-DD HH:mm:ss.SSS" 的字符串
 */
export function generateTestIdentifier(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').replace('Z', '');
  return `[E2E Test] ${timestamp}`;
}

/**
 * 检查标题是否是测试创建的
 *
 * @param title - 资源标题
 * @returns true 表示是测试创建的资源
 */
export function isTestResource(title: string): boolean {
  return title.startsWith('[E2E Test]');
}

/**
 * 等待指定时间
 *
 * @param ms - 等待毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试配置
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 秒
};

/**
 * 带重试的异步操作
 *
 * @param fn - 要执行的异步函数
 * @param maxRetries - 最大重试次数
 * @param delay - 重试间隔（毫秒）
 * @returns 操作结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = RETRY_CONFIG.maxRetries,
  delay = RETRY_CONFIG.retryDelay,
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 检查是否是 429 错误
      const httpError = error as {
        response?: { statusCode?: number; headers?: Record<string, string> };
      };
      if (error instanceof Error && 'response' in error && httpError.response?.statusCode === 429) {
        // 获取 retry-after 或使用默认延迟
        const retryAfter = httpError.response?.headers?.['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay * (i + 1);
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
        await sleep(waitTime);
        continue;
      }

      // 其他错误也重试
      if (i < maxRetries) {
        console.log(`Retry ${i + 1}/${maxRetries} after error: ${(error as Error).message}`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
