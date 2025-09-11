import { GitClient } from "../client";

/**
 * 新建分支，不支持直接切换
 */
export async function gitBranch(client: GitClient, name: string, base?: string) {
  const args = base? ['branch', name, base]: ['branch', name];

  const res = await client.run(args);
  return res;
}