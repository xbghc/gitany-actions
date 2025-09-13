import type { PullRequest } from '@gitany/gitcode';

import { createPrContainer } from './create';
import { execInPrContainer } from './exec';
import { hasPrContainer } from './has';
import type { ContainerOptions } from './types';

function defaultScript() {
  return [
    'rm -rf /tmp/workspace',
    'git clone "$PR_BASE_REPO_URL" /tmp/workspace',
    'cd /tmp/workspace',
    'git remote add head "$PR_HEAD_REPO_URL"',
    'git fetch origin "$PR_BASE_SHA"',
    'git fetch head "$PR_HEAD_SHA"',
    'git checkout "$PR_HEAD_SHA"',
    // 使用 Corepack 准备并激活 pnpm 指定版本（无需全局 enable，避免权限问题）
    // 安装目标项目指定的 pnpm 版本；若未指定则安装最新版
    'PNPM_VER=$(node -e "try{const s=require(\'./package.json\').packageManager||\'\'; if(String(s).includes(\'pnpm@\')){process.stdout.write(String(s).split(\'pnpm@\').pop());}else{process.stdout.write(\'latest\')}}catch(e){process.stdout.write(\'latest\')}")',
    'corepack prepare pnpm@$PNPM_VER --activate',
    'corepack pnpm --version',
    'corepack pnpm install --frozen-lockfile --ignore-scripts',
    'pnpm build',
    'pnpm test',
  ].join(' && ');
}

export async function runPrInContainer(
  repoUrl: string,
  pr: PullRequest,
  options: ContainerOptions = {},
) {
  if (!hasPrContainer(pr.id)) {
    await createPrContainer(repoUrl, pr, options);
  }
  return await execInPrContainer(pr.id, options.script ?? defaultScript());
}

