import { parseGitUrl, GitcodeClient } from '@gitany/gitcode';

export async function permissionCommand(url: string): Promise<void> {
  try {
    const client = new GitcodeClient();
    const permission = await client.repo.getSelfRepoPermissionRole(url);
    console.log(permission);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
