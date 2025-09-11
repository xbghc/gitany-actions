import { userProfileUrl, type UserProfile } from '../../api/user';
import type { GitcodeClient } from '../core';

export async function getUserProfile(client: GitcodeClient): Promise<UserProfile> {
  const url = userProfileUrl();
  return await client.request<UserProfile>(url, 'GET', {});
}

export function createUserModule(client: GitcodeClient) {
  return {
    getProfile: () => getUserProfile(client),
  };
}
