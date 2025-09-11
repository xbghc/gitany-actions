import { type SelfPermissionResponse } from '../../api/repo/self-permission';
import type { RepoRole } from '../../types/repo-role';
import type { GitcodeClient } from '../core';
import { getSelfRepoPermission, getSelfRepoPermissionRole } from './permission';

export class GitcodeClientRepo {
  constructor(private client: GitcodeClient) {}

  async getSelfRepoPermission(url: string): Promise<SelfPermissionResponse> {
    return await getSelfRepoPermission(this.client, url);
  }

  async getSelfRepoPermissionRole(url: string): Promise<RepoRole> {
    return await getSelfRepoPermissionRole(this.client, url);
  }
}
