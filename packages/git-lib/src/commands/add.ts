import type { GitRunner } from '../client';

export interface GitAddOptions {
  all?: boolean;
  update?: boolean;
}

export async function gitAdd(
  run: GitRunner,
  files?: string | string[],
  options: GitAddOptions = {},
) {
  const { all = false, update = false } = options;

  if (all) {
    return run(['add', '-A']);
  }

  if (update) {
    return run(['add', '-u']);
  }

  if (!files) {
    return run(['add', '.']);
  }

  const filesArray = Array.isArray(files) ? files : [files];
  const args = ['add', ...filesArray];

  return run(args);
}
