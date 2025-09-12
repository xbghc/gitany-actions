import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { defaultConfigPath } from '@gitany/gitcode';

/** Returns ~/.gitany/gitcode */
export function gitcodeBaseDir() {
  // Keep single source of truth with gitcode's default config location
  return path.dirname(defaultConfigPath());
}

/** Resolves a sub-directory under ~/.gitany/gitcode */
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
