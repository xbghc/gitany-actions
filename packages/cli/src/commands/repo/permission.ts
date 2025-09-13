import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@gitany/cli');

export async function permissionCommand(url: string): Promise<void> {
  try {
    const client = new GitcodeClient();
    const permission = await client.repo.getSelfRepoPermissionRole(url);
    console.log(permission);
  } catch (err) {
    logger.error({ err }, 'Failed to get repo permission');
    process.exit(1);
  }
}
