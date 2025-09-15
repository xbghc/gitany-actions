import fs from 'node:fs';
import spawn from 'cross-spawn';
import { expandCwd } from '../utils';
import type { GitExecOptions, GitResult } from '../types';
import { GitNotFoundError } from '../errors';

export async function runGit(args: string[], opts: GitExecOptions = {}): Promise<GitResult> {
  const cwd = expandCwd(opts.cwd);
  if (cwd && !fs.existsSync(cwd)) {
    return {
      stdout: '',
      stderr: `cwd not found: ${cwd}`,
      code: 1,
    };
  }

  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
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
      if (e?.code === 'ENOENT' && e?.path === 'git') {
        reject(new GitNotFoundError());
      } else {
        resolve({ stdout, stderr: e?.message ?? String(err), code: 1 });
      }
    });

    child.on('close', (code: number | null) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });
  });
}
