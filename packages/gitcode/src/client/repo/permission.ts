import {
  type SelfPermissionResponse,
  selfPermissionUrl,
  selfPermissionResponseSchema,
} from '../../api/repo/self-permission';
import type { RepoRole } from '../../types/repo-role';
import { isObjectLike } from '../../utils';
import { parseGitUrl } from '../../utils';
import type { GitcodeClient } from '../core';

/**
 * 获取全量的用户权限资料
 */

export async function getSelfRepoPermission(
  client: GitcodeClient,
  url: string,
): Promise<SelfPermissionResponse> {
  const { owner, repo } = parseGitUrl(url) || {};
  if (!owner || !repo) {
    throw new Error(`Invalid Git URL: ${url}`);
  }
  const path = selfPermissionUrl({ owner, repo });
  const json = await client.request(path, 'GET', {});
  return selfPermissionResponseSchema.parse(json);
}
/**
 * 获取用户在仓库的权限角色
 * @returns 'admin' | 'write' | 'read' | 'none'
 */

export async function getSelfRepoPermissionRole(
  client: GitcodeClient,
  url: string,
): Promise<RepoRole> {
  try {
    const json = await getSelfRepoPermission(client, url);
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
  if (!isObjectLike(result)) {
    return 'read';
  }
  const record = result as Record<string, unknown>;
  const rawRole = record['role_info'] ?? record['roleInfo'];
  if (!isObjectLike(rawRole)) {
    return 'read';
  }
  const role = rawRole as Record<string, unknown>;
  const cnVal = role['cn_name'];
  const cn = typeof cnVal === 'string' ? cnVal.trim() : '';
  if (cn.includes('管理员')) return 'admin';
  if (cn.includes('维护者') || cn.includes('开发者')) return 'write';
  return 'read';
}
