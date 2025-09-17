#!/usr/bin/env node
// Guard pre-commit by ensuring docs change alongside package updates.
import { execSync } from 'node:child_process';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getChangedFiles() {
  const from = process.env.DOCS_CHECK_BASE_SHA;
  const to = process.env.DOCS_CHECK_HEAD_SHA;
  if (from && to) {
    return sh(`git diff --name-only ${from} ${to}`).split('\n').filter(Boolean);
  }
  // staged changes
  return sh('git diff --name-only --cached').split('\n').filter(Boolean);
}

function main() {
  if (process.env.SKIP_DOCS_CHECK === '1') {
    console.log('[docs-check] Skipped via SKIP_DOCS_CHECK=1');
    return;
  }

  let files = [];
  try {
    files = getChangedFiles();
  } catch {
    console.log('[docs-check] Unable to compute changed files, skipping.');
    return;
  }

  const codeChanged = files.some(
    (f) => /^packages\/(gitcode|cli)\/.+/.test(f) && /\.(ts|mts|cts|tsx|json)$/.test(f),
  );
  const docsChanged = files.some((f) => /^docs\//.test(f));

  if (codeChanged && !docsChanged) {
    console.error(
      [
        '\n[docs-check] 需要同步更新文档：',
        '检测到 packages/* 源码改动，但本次提交没有包含 docs/* 的更新。',
        '请根据变更同步更新：',
        '  - packages/gitcode → docs/gitcode',
        '  - packages/cli     → docs/cli',
        '如需暂时跳过（不推荐）：SKIP_DOCS_CHECK=1 git commit -m "..."',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }
}

main();
