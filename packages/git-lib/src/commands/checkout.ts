import { GitClient } from '../client';

export async function gitCheckout(client: GitClient, name: string) {
  const res = await client.run(['checkout', name]);
  return res;
}
