import type { GitResult, GitExecOptions } from './types';
import { runGit } from './client/run';

let gitChecked = false;
let gitAvailable = false;
let gitCheckPromise: Promise<boolean> | null = null;

async function ensureGit(): Promise<boolean> {
  if (gitChecked) return gitAvailable;
  if (gitCheckPromise) return gitCheckPromise;

  gitCheckPromise = (async () => {
    const res = await runGit(['--version']);
    gitAvailable = res !== null && res.code === 0;
    gitChecked = true;
    gitCheckPromise = null;
    return gitAvailable;
  })();

  return gitCheckPromise;
}

export async function setRemote(
  remote: string,
  url: string,
  options: GitExecOptions = {},
): Promise<GitResult | null> {
  if (!(await ensureGit())) return null;
  const check = await runGit(['remote', 'get-url', remote], options);
  if (check === null) return null;
  if (check.code === 0) {
    return runGit(['remote', 'set-url', remote, url], options);
  }
  return runGit(['remote', 'add', remote, url], options);
}

export async function commit(
  message: string,
  options: GitExecOptions & { addAll?: boolean } = {},
): Promise<GitResult | null> {
  if (!(await ensureGit())) return null;
  const { addAll = true, cwd } = options;
  if (addAll) {
    const addRes = await runGit(['add', '-A'], { cwd });
    if (addRes === null || addRes.code !== 0) return addRes;
  }
  return runGit(['commit', '-m', message], { cwd });
}

export async function push(
  branch: string,
  options: GitExecOptions & { remote?: string } = {},
): Promise<GitResult | null> {
  if (!(await ensureGit())) return null;
  const { remote = 'origin', cwd } = options;
  return runGit(['push', remote, branch], { cwd });
}


export type { GitResult, GitExecOptions } from './types';
export { GitClient } from './client';
