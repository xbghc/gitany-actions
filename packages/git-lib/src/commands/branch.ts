import type { GitRunner } from '../client/index.js';

/**
 * 新建分支，不支持直接切换
 */
export async function gitBranch(run: GitRunner, name: string, base?: string) {
  const args = base ? ['branch', name, base] : ['branch', name];

  const res = await run(args);
  return res;
}
