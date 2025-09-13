import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { resolveRepoUrl } from '../../utils';

const logger = createLogger('@gitany/cli');

export async function permissionCommand(url?: string): Promise<void> {
  try {
    const repoUrl = await resolveRepoUrl(url);
    const client = new GitcodeClient();
    const permission = await client.repo.getSelfRepoPermissionRole(repoUrl);
    console.log(permission);
  } catch (err) {
    logger.error({ err }, 'Failed to get repo permission');
    process.exit(1);
  }
}
