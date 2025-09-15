import type { PullRequest } from '@gitany/gitcode';

import { createPrContainer } from './create';
import { removeContainer } from './remove-container';
import type { ContainerOptions } from './types';

export async function resetContainer(
  repoUrl: string,
  pr: PullRequest,
  options: ContainerOptions = {},
) {
  await removeContainer(pr.id);
  await createPrContainer(repoUrl, pr, options);
}

