import { GitClient } from "../client";
import { expandCwd } from "../utils";

export async function gitClone(
  client: GitClient,
  url: string,
  directory?: string,
) {
  const expandedDirectory = directory ? expandCwd(directory) : directory;
  const args = expandedDirectory ? ['clone', url, expandedDirectory] : ['clone', url];
  return client.run(args);
}