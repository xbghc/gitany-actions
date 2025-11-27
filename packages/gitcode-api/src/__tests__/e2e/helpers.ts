/**
 * E2E 测试辅助函数
 *
 * 运行前提：
 * - 设置 GITCODE_TOKEN 环境变量
 */
import { GitCodeClient } from '../../client/index.js';

// ================== 环境变量与配置 ==================

/**
 * GitCode Token
 */
export const GITCODE_TOKEN = process.env.GITCODE_TOKEN;

/**
 * 测试仓库 URL（用于所有测试，包括写操作）
 */
export const TEST_WRITE_REPO_URL = 'https://gitcode.com/xbghc/gitcode-demo';

// ================== 测试条件检查 ==================

/**
 * 检查是否可以运行写操作测试
 *
 * 需要满足：有 GITCODE_TOKEN
 *
 * @returns true 表示可以运行写操作测试
 */
export function canRunWriteTests(): boolean {
  return !!GITCODE_TOKEN;
}

/**
 * 用于 describe.skipIf 的辅助函数
 *
 * @returns true 表示应该跳过测试
 */
export function skipIfNoWriteAccess(): boolean {
  if (!canRunWriteTests()) {
    console.log('跳过写操作测试：需要设置 GITCODE_TOKEN 环境变量');
    return true;
  }
  return false;
}

// ================== 客户端创建 ==================

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

// ================== 测试工具函数 ==================

/**
 * 等待指定毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
