import { GitClient } from '../client';

export async function gitSetRemote(client: GitClient, remote: string, url: string) {
  const check = await client.run(['remote', 'get-url', remote]);
  if (check.code === 0) {
    return client.run(['remote', 'set-url', remote, url]);
  }
  return client.run(['remote', 'add', remote, url]);
}
