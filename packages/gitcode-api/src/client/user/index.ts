import {
  userProfileSchema,
  userProfileUrl,
  type UserProfile,
} from '../../api/user/index.js';
import type { GitCodeClient } from '../core.js';
import { parseApiResponse } from '../parser.js';

export async function getUserProfile(client: GitCodeClient): Promise<UserProfile> {
  const url = userProfileUrl();
  const data = await client.http.get(url).json();
  return parseApiResponse(userProfileSchema, data, { endpoint: url, method: "GET" });
}

export class GitCodeClientUser {
  constructor(private client: GitCodeClient) {}

  async getProfile(): Promise<UserProfile> {
    return await getUserProfile(this.client);
  }
}
