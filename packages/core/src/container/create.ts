import type { PullRequest } from '@gitany/gitcode';
import { toGitUrl } from '@gitany/gitcode';

import { collectForwardEnv, docker, ensureDocker } from './shared';
import type { ContainerOptions } from './types';
import { getContainer } from './get';

export async function createPrContainer(
  repoUrl: string,
  pr: PullRequest,
  options: ContainerOptions = {},
) {
  await ensureDocker();

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
      'gitany.prId': String(pr.id),
      'gitany.repoUrl': baseRepoUrl,
    },
  });
  await container.start();
  return container;
}
