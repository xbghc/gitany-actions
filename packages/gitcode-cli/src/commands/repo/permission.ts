import { resolveRepoUrl } from '../../utils/resolve-repo-url.js';
import { withClient } from '../../utils/with-client.js';
import { extractRepoRoleFromSelfPermission } from '@xbghc/gitcode-api';

interface PermissionOptions {
  json?: boolean;
}

export async function permissionCommand(
  url?: string,
  options: PermissionOptions = {},
): Promise<void> {
  await withClient(async (client) => {
    const repoUrl = await resolveRepoUrl(url);

    if (options.json) {
      // 获取完整权限数据
      const permissionData = await client.repo.getSelfRepoPermission(repoUrl);
      const role = extractRepoRoleFromSelfPermission(permissionData);

      // 输出 JSON 格式
      console.log(
        JSON.stringify(
          {
            role,
            role_info: permissionData.role_info,
            resource_tree: permissionData.resource_tree ?? [],
          },
          null,
          2,
        ),
      );
    } else {
      // 默认文本格式输出
      const permission = await client.repo.getSelfRepoPermissionRole(repoUrl);
      console.log(`Repository permission: ${permission}`);
    }
  }, 'Failed to get repo permission');
}
