import { GitcodeClient } from '@xbghc/gitcode-api';

/**
 * 创建一个带有指定 token 的 GitcodeClient 实例
 * @param token - GitCode API token
 * @returns GitcodeClient 实例
 */
export function createGitcodeClient(token: string): GitcodeClient {
  return new GitcodeClient(token);
}
