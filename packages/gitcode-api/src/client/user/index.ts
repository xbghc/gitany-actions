import { userProfileSchema, userProfileUrl, type UserProfile } from '../../api/user/index.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

/**
 * 获取当前登录用户的个人资料
 *
 * @param client - GitCode 客户端实例
 * @returns 用户资料信息
 * @throws {HttpError} 401 - 未授权，需要有效的访问令牌
 *
 * @example
 * ```typescript
 * const profile = await getUserProfile(client);
 * console.log(profile.username, profile.email);
 * ```
 */
export async function getUserProfile(client: GitCodeClient): Promise<UserProfile> {
  const url = userProfileUrl();
  const data = await client.http.get(url).json();
  return parseApiResponse(userProfileSchema, data, { endpoint: url, method: 'GET' });
}

/**
 * GitCode 用户客户端模块
 *
 * 提供当前登录用户相关的操作，如获取个人资料等。
 *
 * @example
 * ```typescript
 * const client = new GitCodeClient(token);
 *
 * // 获取当前用户资料
 * const profile = await client.user.getProfile();
 * console.log(`Hello, ${profile.username}!`);
 * ```
 */
export class GitCodeClientUser {
  constructor(private client: GitCodeClient) {}

  /**
   * 获取当前登录用户的个人资料
   *
   * @returns 用户资料信息，包含用户名、邮箱、头像等
   * @throws {HttpError} 401 - 未授权，需要有效的访问令牌
   *
   * @example
   * ```typescript
   * const profile = await client.user.getProfile();
   * console.log(profile.username, profile.avatar_url);
   * ```
   */
  async getProfile(): Promise<UserProfile> {
    return await getUserProfile(this.client);
  }
}
