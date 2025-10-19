import { expandCwd } from '../utils/index.js';
import type { GitRunner } from '../client/index.js';

export async function gitClone(run: GitRunner, url: string, directory?: string) {
  const expandedDirectory = directory ? expandCwd(directory) : directory;
  const args = expandedDirectory ? ['clone', url, expandedDirectory] : ['clone', url];
  return run(args);
}
