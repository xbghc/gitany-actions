import type { PullRequest } from '@gitany/gitcode';

import { createPrContainer } from './create';
import { removePrContainer } from './remove';
import type { ContainerOptions } from './types';

export async function resetPrContainer(
  repoUrl: string,
  pr: PullRequest,
  options: ContainerOptions = {},
) {
  await removePrContainer(pr.id);
  await createPrContainer(repoUrl, pr, options);
}

