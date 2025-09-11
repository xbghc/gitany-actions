import { createGitcodeClient, parseGitUrl } from '@gitany/gitcode';

export async function permissionCommand(url: string): Promise<void> {
  try {
    const remote = parseGitUrl(url);
    if (!remote) {
      console.error('Unrecognized git URL:', url);
      process.exit(1);
      return;
    }

    const { owner, repo } = remote;

    const client = await createGitcodeClient();
    const permission = await client.repo.getSelfRepoPermissionRole(owner, repo);
    console.log(permission);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
