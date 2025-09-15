import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir, resolveGitcodeSubdir, sha1Hex } from './index';

/** Build a JSON store file path for a given watcher subdir and URL */
export function watcherStoreFile(url: string, subdir: string) {
  const dir = resolveGitcodeSubdir(path.join('watchers', subdir));
  return path.join(dir, `${sha1Hex(url)}.json`);
}

/** Load persisted JSON data synchronously. Returns null if missing */
export function loadJsonSync<T>(url: string, subdir: string): T | null {
  const file = watcherStoreFile(url, subdir);
  if (!fsSync.existsSync(file)) return null;
  const raw = fsSync.readFileSync(file, 'utf8');
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

/** Persist JSON data atomically for watcher */
export async function persistJson<T>(url: string, subdir: string, data: T) {
  const file = watcherStoreFile(url, subdir);
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data), 'utf8');
}
