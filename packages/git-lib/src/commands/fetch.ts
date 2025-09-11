import { GitClient } from "../client";

export async function gitFetch(
  client: GitClient,
  branch?: string,
  options: { remote?: string } = {},
) {
  const { remote = 'origin' } = options;
  const args = branch ? ['fetch', remote, branch] : ['fetch', remote];
  return client.run(args);
}