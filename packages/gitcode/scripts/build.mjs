#!/usr/bin/env node
import { build as esbuild } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function runCmd(cmd, args = []) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const outDir = path.resolve('dist');
  await fs.rm(outDir, { recursive: true, force: true });

  await runCmd('tsc', ['-p', 'tsconfig.json', '--emitDeclarationOnly']);

  await esbuild({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    sourcemap: true,
    outfile: 'dist/index.js',
    external: ['@gitany/shared'],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
