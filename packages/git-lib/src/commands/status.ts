import type { GitClient } from '../client';

export async function gitStatus(client: GitClient): Promise<string | null> {
  const res = await client.run(['status', '--porcelain']);
  if (res.code !== 0) {
    return null;
  }
  return res.stdout.trim();
}
