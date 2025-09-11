import spawn from 'cross-spawn';
import type { GitResult, GitExecOptions } from './types';

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

export async function runGit(args: string[], opts: GitExecOptions = {}): Promise<GitResult | null> {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    child.on('error', (err: unknown) => {
      const e = err as NodeJS.ErrnoException;
      if (e?.code === 'ENOENT') {
        resolve(null);
      } else {
        resolve({ stdout, stderr: e.message, code: 1 });
      }
    });

    child.on('close', (code: number | null) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });
  });
}

export async function setRemote(remote: string, url: string, options: GitExecOptions = {}): Promise<GitResult | null> {
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
  options: GitExecOptions & { addAll?: boolean } = {}
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
  options: GitExecOptions & { remote?: string } = {}
): Promise<GitResult | null> {
  if (!(await ensureGit())) return null;
  const { remote = 'origin', cwd } = options;
  return runGit(['push', remote, branch], { cwd });
}

export async function fetch(
  branch?: string,
  options: GitExecOptions & { remote?: string } = {}
): Promise<GitResult | null> {
  if (!(await ensureGit())) return null;
  const { remote = 'origin', cwd } = options;
  const args = branch ? ['fetch', remote, branch] : ['fetch', remote];
  return runGit(args, { cwd });
}

export async function newBranch(
  name: string,
  options: GitExecOptions & { checkout?: boolean } = {}
): Promise<GitResult | null> {
  if (!(await ensureGit())) return null;
  const { checkout = true, cwd } = options;
  const res = await runGit(['branch', name], { cwd });
  if (res === null || res.code !== 0 || !checkout) return res;
  return runGit(['checkout', name], { cwd });
}

export type { GitResult, GitExecOptions } from "./types";

