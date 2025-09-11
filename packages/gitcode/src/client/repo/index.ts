import { type SelfPermissionResponse } from '../../api/repo/self-permission';
import type { RepoRole } from '../../types/repo-role';
import type { GitcodeClient } from '../core';
import { getSelfRepoPermission, getSelfRepoPermissionRole } from './permission';

export class GitCodeClientRepo {
  constructor(private client: GitcodeClient) {}
  
  async getSelfRepoPermission(owner: string, repo: string): Promise<SelfPermissionResponse> {
    return await getSelfRepoPermission(this.client, owner, repo);
  }

  async getSelfRepoPermissionRole(owner: string, repo: string): Promise<RepoRole> {
    return await getSelfRepoPermissionRole(this.client, owner, repo);
  }
}
