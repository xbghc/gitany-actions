import { userProfileSchema, userProfileUrl, type UserProfile } from '../../api/user';
import type { GitcodeClient } from '../core';

export async function getUserProfile(client: GitcodeClient): Promise<UserProfile> {
  const url = userProfileUrl();
  const data = await client.request<unknown>(url, 'GET', {});
  return userProfileSchema.parse(data);
}

export class GitcodeClientUser {
  constructor(private client: GitcodeClient) {}

  async getProfile(): Promise<UserProfile> {
    return await getUserProfile(this.client);
  }
}

