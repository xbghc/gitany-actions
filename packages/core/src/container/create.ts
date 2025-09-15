import type { PullRequest } from '@gitany/gitcode';
import { toGitUrl } from '@gitany/gitcode';

import { docker, ensureDocker, forward } from './shared';
import { containers } from './store';
import type { ContainerOptions } from './types';

export async function createPrContainer(
  repoUrl: string,
  pr: PullRequest,
  options: ContainerOptions = {},
) {
  await ensureDocker();

  const env: string[] = [];
  for (const v of forward) {
    const value = process.env[v];
    if (value) env.push(`${v}=${value}`);
  }
  if (options.env) {
    for (const [k, v] of Object.entries(options.env)) env.push(`${k}=${v}`);
  }

  const baseRepoUrl = toGitUrl(repoUrl);
  const headRepoUrl = toGitUrl(pr.head.repo.html_url);

  env.push(
    `PR_BASE_REPO_URL=${baseRepoUrl}`,
    `PR_HEAD_REPO_URL=${headRepoUrl}`,
    `PR_BASE_SHA=${pr.base.sha}`,
    `PR_HEAD_SHA=${pr.head.sha}`,
    `PR_REPO_URL=${baseRepoUrl}`,
  );

  const container = await docker.createContainer({
    Image: options.image ?? 'node:20',
    Cmd: ['sh', '-lc', 'tail -f /dev/null'],
    Env: env,
    User: 'node',
    HostConfig: { AutoRemove: options.autoRemove ?? false },
  });
  await container.start();
  containers.set(pr.id, { container, options });
  return container;
}

