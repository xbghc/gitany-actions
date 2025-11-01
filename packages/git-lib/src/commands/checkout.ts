import type { GitRunner } from '../client/index.js';

export async function gitCheckout(run: GitRunner, name: string) {
  const res = await run(['checkout', name]);
  return res;
}
