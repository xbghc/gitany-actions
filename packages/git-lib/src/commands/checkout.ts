import type { GitRunner } from '../client';

export async function gitCheckout(run: GitRunner, name: string) {
  const res = await run(['checkout', name]);
  return res;
}
