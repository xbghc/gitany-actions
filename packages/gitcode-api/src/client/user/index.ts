import {
  userNamespaceSchema,
  userNamespaceUrl,
  userProfileSchema,
  userProfileUrl,
  type UserNamespace,
  type UserProfile,
} from '../../api/user/index.js';
import type { GitCodeClient } from '../core.js';

export async function getUserProfile(client: GitCodeClient): Promise<UserProfile> {
  const url = userProfileUrl();
  const data = await client.http.get(url).json();
  return userProfileSchema.parse(data);
}

export async function getUserNamespace(client: GitCodeClient): Promise<UserNamespace> {
  const url = userNamespaceUrl();
  const data = await client.http.get(url).json();
  return userNamespaceSchema.parse(data);
}

export class GitCodeClientUser {
  constructor(private client: GitCodeClient) {}

  async getProfile(): Promise<UserProfile> {
    return await getUserProfile(this.client);
  }

  async getNamespace(): Promise<UserNamespace> {
    return await getUserNamespace(this.client);
  }
}
