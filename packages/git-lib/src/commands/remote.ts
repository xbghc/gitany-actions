import type { GitRunner } from '../client/index.js';

export async function gitSetRemote(run: GitRunner, remote: string, url: string) {
  const check = await run(['remote', 'get-url', remote]);
  if (check.code === 0) {
    return run(['remote', 'set-url', remote, url]);
  }
  return run(['remote', 'add', remote, url]);
}
