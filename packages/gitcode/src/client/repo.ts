import { selfPermissionUrl, type SelfPermissionResponse } from '../api/repo/self-permission';
import type { RepoRole } from '../types/repo-role';
import type { GitcodeClient } from './core';

export async function getSelfRepoPermission(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<SelfPermissionResponse> {
  const path = selfPermissionUrl({ owner, repo });
  return await client.request(path, 'GET', {});
}

export async function getSelfRepoPermissionRole(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<RepoRole> {
  try {
    const json = await getSelfRepoPermission(client, owner, repo);
    return extractRepoRoleFromSelfPermission(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/\b404\b/.test(msg)) {
      return 'none';
    }
    throw err;
  }
}

export function extractRepoRoleFromSelfPermission(result: unknown): RepoRole {
  if (result && typeof result === 'object') {
    const obj: any = result;
    const role = obj.role_info || obj.roleInfo;
    if (!role) {
      return 'read';
    }
    const cn = typeof role.cn_name === 'string' ? role.cn_name.trim() : '';
    if (cn.includes('管理员')) return 'admin';
    if (cn.includes('维护者') || cn.includes('开发者')) return 'write';
    return 'read';
  }
  return 'read';
}

export function createRepoModule(client: GitcodeClient) {
  return {
    getSelfRepoPermission: (owner: string, repo: string) =>
      getSelfRepoPermission(client, owner, repo),
    getSelfRepoPermissionRole: (owner: string, repo: string) =>
      getSelfRepoPermissionRole(client, owner, repo),
  };
}
