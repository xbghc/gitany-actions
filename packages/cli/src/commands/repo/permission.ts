import { GitcodeAuth, parseGitUrl } from '@gitany/gitcode';

export async function permissionCommand(url: string): Promise<void> {
  try {
    const remote = parseGitUrl(url);
    if (!remote) {
      console.error('Unrecognized git URL:', url);
      process.exit(1);
      return;
    }

    const { owner, repo } = remote;

    const auth = new GitcodeAuth();
    const client = await auth.client();
    const permission = await client.getSelfRepoPermissionRole(owner, repo);
    console.log(permission);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
