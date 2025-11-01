import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

/** Returns ~/.gitcode */
export function gitcodeBaseDir() {
  // This was previously derived from defaultConfigPath in @xbghc/gitcode-api
  return path.join(homedir(), '.gitcode');
}

/** Resolves a sub-directory under ~/.gitcode */
export function resolveGitcodeSubdir(subdir: string) {
  return path.join(gitcodeBaseDir(), subdir);
}

/** Ensures a directory exists */
export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** sha1 hex digest helper */
export function sha1Hex(input: string) {
  return createHash('sha1').update(input).digest('hex');
}
