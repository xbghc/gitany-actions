import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { parseGitUrl } from '@xbghc/gitcode-api';

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

/**
 * 获取仓库状态存储目录
 *
 * @param url - 仓库 URL
 * @returns ~/.gitcode/repos/{owner-repo} 或 ~/.gitcode/repos/{sha1(url)} (fallback)
 *
 * @example
 * ```typescript
 * getRepoStateDir('https://gitcode.com/owner/repo.git')
 * // => '~/.gitcode/repos/owner-repo'
 *
 * getRepoStateDir('invalid-url')
 * // => '~/.gitcode/repos/{sha1-hash}'
 * ```
 */
export function getRepoStateDir(url: string): string {
  const parsed = parseGitUrl(url);

  if (!parsed) {
    // Fallback：无法解析的 URL 使用 SHA1 哈希
    return path.join(gitcodeBaseDir(), 'repos', sha1Hex(url));
  }

  const { owner, repo } = parsed;
  // 清理特殊字符（通常不需要，但保险起见）
  const safeName = `${owner}-${repo}`.replace(/[^a-zA-Z0-9_-]/g, '-');

  return path.join(gitcodeBaseDir(), 'repos', safeName);
}
