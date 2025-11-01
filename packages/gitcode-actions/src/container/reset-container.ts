import type { PullRequest } from '@xbghc/gitcode-api';

import { createPrContainer } from './create.js';
import { removeContainer } from './remove-container.js';
import type { ContainerOptions } from './types.js';

export async function resetContainer(
  repoUrl: string,
  pr: PullRequest,
  options: ContainerOptions = {},
) {
  await removeContainer(pr.id);
  await createPrContainer(repoUrl, pr, options);
}
