import { GitClient } from "../client";

export async function gitPush(
  client: GitClient,
  branch: string,
  options: { remote?: string } = {},
) {
  const { remote = 'origin' } = options;
  return client.run(['push', remote, branch]);
}