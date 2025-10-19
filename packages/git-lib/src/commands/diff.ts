import type { GitRunner } from '../client/index.js';

export interface DiffOptions {
  diffFilter?: 'A' | 'M' | 'D';
  nameOnly?: boolean;
  patterns?: string[];
}

export async function gitDiffCommits(
  run: GitRunner,
  commit1: string,
  commit2: string,
  options: DiffOptions = {},
) {
  const args = ['diff', commit1, commit2];
  if (options.diffFilter) {
    args.push(`--diff-filter=${options.diffFilter}`);
  }
  if (options.nameOnly) {
    args.push('--name-only');
  }
  if (options.patterns && options.patterns.length > 0) {
    args.push('--', ...options.patterns);
  }

  const res = await run(args);
  return res;
}
