import { rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';

async function main() {
  await rm('dist', { recursive: true, force: true });
  execSync('tsc -p tsconfig.json --emitDeclarationOnly', { stdio: 'inherit' });
  await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: ['node18'],
    sourcemap: true,
    banner: {
      js: 'import { createRequire as __createRequire } from "module";\nconst require = __createRequire(import.meta.url);',
    },
    outfile: 'dist/index.js',
    external: ['ssh2', 'cpu-features', 'dockerode', '@gitany/gitcode'],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
