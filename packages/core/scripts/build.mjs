#!/usr/bin/env node
import { build as esbuild } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function runCmd(cmd, args = []) {
  await new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on('error', reject);
  });
}

async function build() {
  const outdir = path.resolve('dist');
  await fs.rm(outdir, { recursive: true, force: true });

  // Declarations only
  await runCmd('tsc', ['-p', 'tsconfig.json', '--emitDeclarationOnly']);

  // Bundle runtime
  await esbuild({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    sourcemap: 'both',
    sourcesContent: true,
    outfile: 'dist/index.js',
    // Do not bundle certain deps to avoid CJS-in-ESM dynamic require issues
    external: [
      '@gitany/shared',
      '@gitany/gitcode',
      'dockerode', // keep as external so Node ESM loads CJS properly
      'ssh2',
      'cpu-features',
    ],
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
