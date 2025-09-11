import type { GitClient } from '../client';

export function gitStatus(client: GitClient): Promise<string | null> {
  return new Promise((resolve) => {
    client.run(['status', '--porcelain']).then((res) => {
      if (res === null || res.code !== 0) {
        resolve(null);
      } else {
        resolve(res.stdout.trim());
      }
    });
  });
}
