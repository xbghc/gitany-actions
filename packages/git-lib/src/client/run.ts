import spawn from 'cross-spawn';
import type { GitExecOptions, GitResult } from '../types';


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
