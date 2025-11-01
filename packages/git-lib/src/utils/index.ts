import os from 'node:os';
import path from 'node:path';

export { resolveRepoUrl } from './resolve-repo-url.js';

export function expandCwd(cwd?: string) {
  if (!cwd) return cwd;
  if (cwd.startsWith('~')) {
    return path.join(os.homedir(), cwd.slice(1));
  }
  return cwd;
}
