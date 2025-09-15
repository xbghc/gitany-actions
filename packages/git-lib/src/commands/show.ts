import { GitClient } from '../client';

export async function gitShowFile(
  client: GitClient,
  ref: string,
  filePath: string,
): Promise<string | null> {
  const res = await client.run(['show', `${ref}:${filePath}`]);
  if (res.code !== 0) {
    return null;
  }
  return res.stdout.trim();
}
