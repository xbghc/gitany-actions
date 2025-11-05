import {
  userProfileSchema,
  userProfileUrl,
  userNamespaceSchema,
  userNamespaceUrl,
  type UserProfile,
  type UserNamespace,
} from '../../api/user/index.js';
import type { GitcodeClient } from '../core.js';

export async function getUserProfile(client: GitcodeClient): Promise<UserProfile> {
  const url = userProfileUrl();
  const data = await client.http.get(url).json();
  return userProfileSchema.parse(data);
}

export async function getUserNamespace(client: GitcodeClient): Promise<UserNamespace> {
  const url = userNamespaceUrl();
  const data = await client.http.get(url).json();
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
