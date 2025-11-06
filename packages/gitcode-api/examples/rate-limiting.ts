/**
 * Rate Limiting 示例
 *
 * GitCodeClient 内置 429 自动处理机制
 */
import { GitCodeClient, isHttpError } from '../src/index.js';

const token = process.env.GITCODE_TOKEN;
if (!token) {
  console.error('请设置 GITCODE_TOKEN 环境变量');
  process.exit(1);
}

const client = new GitCodeClient(token);

async function main() {
  console.log('Rate Limiting 功能演示\n');

  // 示例 1: 查询限流状态
  console.log('1. 查询限流状态:');
  console.log(`当前是否限流: ${client.isRateLimited()}`);
  console.log(`剩余等待时间: ${client.getRateLimitWaitTime()}秒\n`);

  // 示例 2: 正常请求
  console.log('2. 发起正常请求:');
  try {
    const profile = await client.user.getProfile();
    console.log(`✅ 成功获取用户 ${profile.login} 的资料\n`);
  } catch (error) {
    if (isHttpError(error) && error.response?.statusCode === 429) {
      console.log('⚠️ 触发限流，请稍后重试\n');
    } else {
      throw error;
    }
  }

  // 示例 3: 模拟限流后的请求（如果已触发限流）
  if (client.isRateLimited()) {
    console.log('3. 限流中，尝试发起请求:');
    try {
      await client.pr.list('https://gitcode.com/xbghc/gitcode-actions');
    } catch (error) {
      if (isHttpError(error) && error.response?.statusCode === 429) {
        const waitTime = client.getRateLimitWaitTime();
        console.log(`❌ 请求被阻止，需要等待 ${waitTime} 秒`);
      }
    }
  }

  // 示例 4: 等待限流解除
  if (client.isRateLimited()) {
    const waitTime = client.getRateLimitWaitTime();
    console.log(`\n4. 等待 ${waitTime} 秒后自动恢复...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime * 1000 + 100));
    console.log('✅ 限流已解除，可以继续发送请求');
  }
}

main().catch(console.error);
