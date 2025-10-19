import type { GitRunner } from '../client/index.js';

export async function gitFetch(
  run: GitRunner,
  branch?: string,
  options: { remote?: string } = {},
) {
  const { remote = 'origin' } = options;
  const args = branch ? ['fetch', remote, branch] : ['fetch', remote];
  return run(args);
}
