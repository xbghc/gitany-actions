import { GitClient } from "../client";

export function gitShowFile(client: GitClient, ref: string, filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    client.run(['show', `${ref}:${filePath}`]).then((res) => {
      if (res === null || res.code !== 0) {
        resolve(null);
      } else {
        resolve(res.stdout.trim());
      }
    });
  });
}