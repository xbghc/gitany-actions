import type { GitRunner } from '../client/index.js';

export async function gitPush(
  run: GitRunner,
  branch: string,
  options: { remote?: string } = {},
) {
  const { remote = 'origin' } = options;
  return run(['push', remote, branch]);
}
