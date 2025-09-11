import { GitClient } from "../client";

export interface GitAddOptions {
  all?: boolean;
  update?: boolean;
}

export async function gitAdd(
  client: GitClient,
  files?: string | string[],
  options: GitAddOptions = {},
) {
  const { all = false, update = false } = options;
  
  if (all) {
    return client.run(['add', '-A']);
  }
  
  if (update) {
    return client.run(['add', '-u']);
  }
  
  if (!files) {
    return client.run(['add', '.']);
  }
  
  const filesArray = Array.isArray(files) ? files : [files];
  const args = ['add', ...filesArray];
  
  return client.run(args);
}