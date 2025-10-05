import type { GitRunner } from '../client';

export async function gitShowFile(
  run: GitRunner,
  ref: string,
  filePath: string,
): Promise<string | null> {
  const res = await run(['show', `${ref}:${filePath}`]);
  if (res.code !== 0) {
    return null;
  }
  return res.stdout.trim();
}
