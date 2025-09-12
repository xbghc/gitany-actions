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
import { z } from 'zod';

export const roleInfoSchema = z.object({
  /** Role unique id. */
  id: z.number(),
  /** Role display name. */
  name: z.string(),
  /** Optional code/identifier. */
  code: z.string().optional(),
  /** Optional role type/category (e.g., owner, maintainer). */
  type: z.string().optional(),
  /** Description if provided. */
  description: z.string().nullable().optional(),
  // 省略部分内容
});

export type RoleInfo = z.infer<typeof roleInfoSchema>;

export const permissionPointSchema = z.object({
  /** Permission code for the action, e.g., repo.pull, repo.push. */
  code: z.string(),
  /** Human-readable name of the permission. */
  name: z.string(),
  /** Whether the permission is granted. */
  enabled: z.boolean(),
  // 省略部分内容
});

export type PermissionPoint = z.infer<typeof permissionPointSchema>;

export interface ResourceNode {
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
  // 省略部分内容
}

export const resourceNodeSchema: z.ZodType<ResourceNode> = z.lazy(() =>
  z.object({
    id: z.number().optional(),
    name: z.string(),
    code: z.string(),
    permissions: permissionPointSchema.array().optional(),
    children: z.array(resourceNodeSchema).optional(),
    // 省略部分内容
  }),
);

export const selfPermissionResponseSchema = z.object({
  /** Current member role information; omitted for read-only users. */
  role_info: roleInfoSchema.optional(),
  /** Permission resource tree. */
  resource_tree: z.array(resourceNodeSchema),
  // 省略部分内容
});

export type SelfPermissionResponse = z.infer<typeof selfPermissionResponseSchema>;

import { API_BASE } from '../constants';

/**
 * Builds the request path for the Self Permission endpoint.
 * Example: /repos/owner/repo/collaborators/self-permission
 */
export function selfPermissionUrl(params: SelfPermissionParams): string {
  const { owner, repo } = params;
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/self-permission`;
}
