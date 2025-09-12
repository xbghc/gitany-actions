import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createHash } from 'node:crypto';

/** Returns ~/.gitany/gitcode */
// TODO 这个可以移动到 shared 包中，gitcode包也有读取token的代码，也需要这个路径
export function gitcodeBaseDir() {
  return path.join(os.homedir(), '.gitany', 'gitcode');
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

