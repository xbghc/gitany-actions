import { expandCwd } from '../utils';
import type { GitRunner } from '../client';

export async function gitClone(run: GitRunner, url: string, directory?: string) {
  const expandedDirectory = directory ? expandCwd(directory) : directory;
  const args = expandedDirectory ? ['clone', url, expandedDirectory] : ['clone', url];
  return run(args);
}
