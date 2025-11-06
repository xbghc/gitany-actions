import { GitCodeClient } from '@xbghc/gitcode-api';

/**
 * 创建一个带有指定 token 的 GitCodeClient 实例
 * @param token - GitCode API token
 * @returns GitCodeClient 实例
 */
export function createGitCodeClient(token: string): GitCodeClient {
  return new GitCodeClient(token);
}
