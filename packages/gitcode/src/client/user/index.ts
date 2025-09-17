import {
  userProfileSchema,
  userProfileUrl,
  userNamespaceSchema,
  userNamespaceUrl,
  type UserProfile,
  type UserNamespace,
} from '../../api/user';
import type { GitcodeClient } from '../core';

export async function getUserProfile(client: GitcodeClient): Promise<UserProfile> {
  const url = userProfileUrl();
  const data = await client.request<unknown>(url, 'GET', {});
  return userProfileSchema.parse(data);
}

export async function getUserNamespace(client: GitcodeClient): Promise<UserNamespace> {
  const url = userNamespaceUrl();
  const data = await client.request<unknown>(url, 'GET', {});
  return userNamespaceSchema.parse(data);
}

export class GitcodeClientUser {
  constructor(private client: GitcodeClient) {}

  async getProfile(): Promise<UserProfile> {
    return await getUserProfile(this.client);
  }

  async getNamespace(): Promise<UserNamespace> {
    return await getUserNamespace(this.client);
  }
}
