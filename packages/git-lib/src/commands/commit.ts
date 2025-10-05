import type { GitRunner } from '../client';

export async function gitCommit(
  run: GitRunner,
  message: string,
  options: { addAll?: boolean } = {},
) {
  const { addAll = true } = options;
  if (addAll) {
    const addRes = await run(['add', '-A']);
    if (addRes.code !== 0) return addRes;
  }
  return run(['commit', '-m', message]);
}
