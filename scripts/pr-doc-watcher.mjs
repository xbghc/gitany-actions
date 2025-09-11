#!/usr/bin/env node
import { exec as execCb } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { promisify } from 'node:util';

const exec = promisify(execCb);

const REPO_URL = process.env.REPO_URL || '';
const REPO_DIR = process.env.REPO_DIR || path.join('./repos', repoName(REPO_URL));
const DOC_PATTERN = process.env.DOC_PATTERN || /^docs\//;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

function repoName(url) {
  const name = url.split('/').pop() || '';
  return name.replace(/\.git$/, '');
}

function parseRepo(url) {
  const match = url.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?/);
  if (!match) throw new Error('Invalid repo url');
  return match.groups;
}

function isDoc(file) {
  return DOC_PATTERN.test(file);
}

async function ghRequest(pathname, options = {}) {
  const url = new URL(`https://api.github.com${pathname}`);
  const res = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'pr-doc-watcher',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function ensureRepo(url, dir) {
  try {
    await fs.access(dir);
    await exec(`git -C ${dir} fetch origin`);
  } catch {
    await exec(`git clone ${url} ${dir}`);
  }
}

async function runClaude(dir, diffText) {
  const commitToken = '__CLAUDE_COMMIT__';
  const skipToken = '__CLAUDE_SKIP__';
  const prompt = [
    '请根据以下git diff完善文档。',
    `若已完成修改，请输出 ${commitToken}。`,
    `若无需修改或修改失败，请输出 ${skipToken}。`,
    diffText,
  ].join('\n\n');
  try {
    const { stdout } = await exec(`claude -p ${JSON.stringify(prompt)} --allow-write`, {
      cwd: dir,
    });
    if (stdout.includes(commitToken)) return 'commit';
    if (stdout.includes(skipToken)) return 'skip';
    return 'error';
  } catch {
    return 'error';
  }
}

async function onOpen(prNumber) {
  const { owner, repo } = parseRepo(REPO_URL);
  const pr = await ghRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  const baseSha = pr.base?.sha;
  const headSha = pr.head?.sha;
  const diff = await ghRequest(`/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`);
  const docFiles = diff.files?.filter(f => isDoc(f.filename)) || [];
  if (docFiles.length === 0) return 0;
  const diffText = docFiles
    .map(f => `## ${f.filename}\n${f.patch || ''}`)
    .join('\n');
  await ensureRepo(REPO_URL, REPO_DIR);
  const branch = `auto-doc-${Date.now()}`;
  await exec(`git -C ${REPO_DIR} checkout -b ${branch}`);
  const result = await runClaude(REPO_DIR, diffText);
  if (result !== 'commit') return result === 'skip' ? 0 : 1;
  await exec(`git -C ${REPO_DIR} add docs`);
  await exec(`git -C ${REPO_DIR} commit -m "chore: refine docs"`);
  await exec(`git -C ${REPO_DIR} push origin ${branch}`);
  await ghRequest(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'chore: refine docs',
      head: branch,
      base: pr.base?.ref,
    }),
  });
  return 0;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const pr = Number(process.argv[2]);
  onOpen(pr).then(code => process.exit(code)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { onOpen };
