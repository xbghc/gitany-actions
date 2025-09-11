import { build } from 'esbuild';

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node18'],
  sourcemap: true,
  outfile: 'dist/index.js',
  // Ensure CommonJS deps (e.g., cross-spawn) can require Node built-ins
  // when running as ESM by providing a Node-compatible `require`.
  banner: {
    js: 'import { createRequire as __createRequire } from "module";\nconst require = __createRequire(import.meta.url);',
  },
  external: ['child_process'],
}).catch(() => process.exit(1));
