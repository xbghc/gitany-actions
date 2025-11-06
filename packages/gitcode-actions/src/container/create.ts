import type { PullRequest } from '@xbghc/gitcode-api';
import { toGitUrl } from '@xbghc/gitcode-api';

import { collectForwardEnv, docker } from './shared.js';
import type { ContainerOptions } from './types.js';
import { getContainer } from './get.js';

export async function createPrContainer(
  repoUrl: string,
  pr: PullRequest,
  options: ContainerOptions = {},
) {
  const baseRepoUrl = toGitUrl(repoUrl);
  const existing = await getContainer({ pr: pr.id, repoUrl: baseRepoUrl });
  if (existing) {
    const info = await existing.inspect();
    if (info.State?.Status !== 'running') await existing.start();
    return existing;
  }

  const env: string[] = collectForwardEnv();
  if (options.env) {
    for (const [k, v] of Object.entries(options.env)) env.push(`${k}=${v}`);
  }

  if (!pr.head.repo) {
    throw new Error(`无法创建 PR #${pr.id} 的容器: 源仓库已被删除或不可访问`);
  }

  const headRepoUrl = toGitUrl(pr.head.repo.html_url);

  env.push(
    `PR_BASE_REPO_URL=${baseRepoUrl}`,
    `PR_HEAD_REPO_URL=${headRepoUrl}`,
    `PR_BASE_SHA=${pr.base.sha}`,
    `PR_HEAD_SHA=${pr.head.sha}`,
    `PR_REPO_URL=${baseRepoUrl}`,
  );

  const container = await docker.createContainer({
    name: `pr-${pr.id}`,
    Image: options.image ?? 'node:20',
    Cmd: ['sh', '-lc', 'tail -f /dev/null'],
    Env: env,
    User: 'node',
    HostConfig: { AutoRemove: options.autoRemove ?? false },
    Labels: {
      'gitcode.prId': String(pr.id),
      'gitcode.repoUrl': baseRepoUrl,
    },
  });
  await container.start();
  return container;
}
