import type { GitcodeClient } from './core';
import {
  userProfileSchema,
  userProfileUrl,
  userNamespaceSchema,
  userNamespaceUrl,
  type UserProfile,
  type UserNamespace,
} from '../api/user';

export class UserClient {
  constructor(private readonly client: GitcodeClient) {}

  async getProfile(): Promise<UserProfile> {
    const url = userProfileUrl();
    const data = await this.client.request<unknown>(url, 'GET', {});
    return userProfileSchema.parse(data);
  }

  async getNamespace(): Promise<UserNamespace> {
    const url = userNamespaceUrl();
    const data = await this.client.request<unknown>(url, 'GET', {});
    return userNamespaceSchema.parse(data);
  }
}
