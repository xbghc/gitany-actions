#!/usr/bin/env node
import { build as esbuild } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function runCmd(cmd, args = []) {
  await new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    p.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
    p.on('error', reject);
  });
}

async function build() {
  const outdir = path.resolve('dist');
  await fs.rm(outdir, { recursive: true, force: true });

  // Generate type declarations only
  await runCmd('tsc', ['-p', 'tsconfig.json', '--emitDeclarationOnly']);

  // Bundle runtime ESM
  await esbuild({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    sourcemap: true,
    outfile: 'dist/index.js',
    external: ['@gitany/gitcode', '@gitany/shared', '@gitany/git-lib', 'commander'],
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
