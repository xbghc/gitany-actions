import type { GitRunner } from '../client/index.js';

export async function gitStatus(run: GitRunner): Promise<string | null> {
  const res = await run(['status', '--porcelain']);
  if (res.code !== 0) {
    return null;
  }
  return res.stdout.trim();
}
