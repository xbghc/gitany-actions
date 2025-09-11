import { GitcodeClient } from './client';
import { FileAuthStorage, defaultConfigPath } from './client/auth';

export async function createGitcodeClient(): Promise<GitcodeClient> {
  const storage = new FileAuthStorage(defaultConfigPath());
  const envToken = process.env.GITCODE_TOKEN;
  let token: string | null | undefined = envToken;
  if (!token) {
    const disk = (await storage.read()) || {};
    token = disk.token ?? null;
  }
  return new GitcodeClient({ token: token ?? null });
}

export { FileAuthStorage, defaultConfigPath } from './client/auth';
