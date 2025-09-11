import { userProfileUrl, type UserProfileResponse } from '../../api/user';
import type { GitcodeClient } from '../core';

export async function getUserProfile(client: GitcodeClient): Promise<UserProfileResponse> {
  const url = userProfileUrl();
  return await client.request<UserProfileResponse>(url, 'GET', {});
}

export class GitcodeClientUser {
  constructor(private client: GitcodeClient) {}

  async getProfile(): Promise<UserProfileResponse> {
    return await getUserProfile(this.client);
  }
}

