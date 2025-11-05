/**
 * E2E 测试辅助函数
 */
import type { GitCodeClient } from '../../client/index.js';
import { isHttpError } from '../../client/http-error.js';

/**
 * 带 429 重试的 API 调用包装器
 *
 * @param fn - 要执行的 API 调用函数
 * @param client - GitCodeClient 实例
 * @param maxRetries - 最大重试次数（默认 3）
 * @returns API 调用结果
 *
 * @example
 * const prs = await withRetry(
 *   () => client.pr.list(url),
 *   client
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  client: GitCodeClient,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 检查是否处于限流状态
      if (client.isRateLimited()) {
        const waitTime = client.getRateLimitWaitTime();
        console.warn(`⚠️ Rate limited, waiting ${waitTime}s before attempt ${attempt + 1}...`);
        await sleep(waitTime * 1000);
      }

      // 执行 API 调用
      return await fn();
    } catch (error) {
      const is429 = isHttpError(error) && error.response?.statusCode === 429;

      if (is429 && attempt < maxRetries - 1) {
        const waitTime = client.getRateLimitWaitTime() || 5; // 默认等待 5 秒
        console.warn(
          `⚠️ Got 429, retry ${attempt + 1}/${maxRetries - 1} after ${waitTime}s...`,
        );
        await sleep(waitTime * 1000);
      } else {
        // 非 429 错误或已达最大重试次数，直接抛出
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * 等待指定毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 在测试前检查并等待限流结束
 *
 * @param client - GitCodeClient 实例
 *
 * @example
 * beforeEach(async () => {
 *   await waitIfRateLimited(client);
 * });
 */
export async function waitIfRateLimited(client: GitCodeClient): Promise<void> {
  if (client.isRateLimited()) {
    const waitTime = client.getRateLimitWaitTime();
    console.warn(`⚠️ Rate limited, waiting ${waitTime}s before test...`);
    await sleep(waitTime * 1000 + 100); // 额外等待 100ms 确保完全恢复
  }
}
