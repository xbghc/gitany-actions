#!/usr/bin/env node
import { build as esbuild } from 'esbuild';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

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

  const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const externalDeps = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ];

  await esbuild({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    sourcemap: 'both',
    sourcesContent: true,
    outfile: 'dist/index.js',
    external: externalDeps,
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
