/**
 * Self Permission API
 *
 * Endpoint: GET /api/v5/repos/{owner}/{repo}/collaborators/self-permission
 * Returns the current authenticated user's permission on a repository.
 */

/**
 * Path params for Self Permission request.
 */
export type SelfPermissionParams = {
  /** Repository owner (user or organization). */
  owner: string;
  /** Repository name (without .git). */
  repo: string;
};

/**
 * Response payload for Self Permission request, per docs this returns
 * granular permission points (booleans), e.g. pull/push/admin.
 * Additional fields may be present as the platform evolves.
 */
export type RoleInfo = {
  /** Role unique id. */
  id: number;
  /** Role display name. */
  name: string;
  /** Optional code/identifier. */
  code?: string;
  /** Optional role type/category (e.g., owner, maintainer). */
  type?: string;
  /** Description if provided. */
  description?: string | null;
  [k: string]: unknown;
};

export type PermissionPoint = {
  /** Permission code for the action, e.g., repo.pull, repo.push. */
  code: string;
  /** Human-readable name of the permission. */
  name: string;
  /** Whether the permission is granted. */
  enabled: boolean;
  [k: string]: unknown;
};

export type ResourceNode = {
  /** Optional unique id for the resource node. */
  id?: number;
  /** Resource display name. */
  name: string;
  /** Resource code/identifier. */
  code: string;
  /** Permission points under this resource. */
  permissions?: PermissionPoint[];
  /** Child resource nodes. */
  children?: ResourceNode[];
  [k: string]: unknown;
};

export type SelfPermissionResponse = {
  /** Current member role information; omitted for read-only users. */
  role_info?: RoleInfo;
  /** Permission resource tree. */
  resource_tree: ResourceNode[];
} & Record<string, unknown>;

import { API_BASE } from '../constants';

/**
 * Builds the request path for the Self Permission endpoint.
 * Example: /repos/owner/repo/collaborators/self-permission
 */
export function selfPermissionUrl(params: SelfPermissionParams): string {
  const { owner, repo } = params;
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/self-permission`;
}
