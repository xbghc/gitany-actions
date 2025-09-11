import { GitClient } from "../client";

export async function gitCommit(
  client: GitClient,
  message: string,
  options: { addAll?: boolean } = {},
) {
  const { addAll = true } = options;
  if (addAll) {
    const addRes = await client.run(['add', '-A']);
    if (addRes === null || addRes.code !== 0) return addRes;
  }
  return client.run(['commit', '-m', message]);
}