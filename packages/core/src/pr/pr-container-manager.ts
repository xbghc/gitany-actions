import { GitcodeClient, PullRequest, PRComment } from '@gitany/gitcode';

import { createPrContainer, removeContainer } from '../container';
import type { ContainerOptions } from '../container/types';
import { watchPullRequest } from './watcher';

export interface ManagePrContainersOptions {
  /** Options passed to container creation. */
  container?: ContainerOptions;
  /** Optional watch options forwarded to watchPullRequest. */
  watch?: {
    intervalSec?: number;
    commentType?: 'diff_comment' | 'pr_comment';
    onComment?: (pr: PullRequest, comment: PRComment) => void;
  };
}

/**
 * Automatically manage PR containers.
 *
 * - When a PR is opened, create a container.
 * - When a PR is closed or merged, remove the container.
 *
 * Returns a function to stop watching.
 */
export function managePrContainers(
  client: GitcodeClient,
  repoUrl: string,
  options: ManagePrContainersOptions = {},
) {
  const { container: containerOptions, watch } = options;
  return watchPullRequest(client, repoUrl, {
    intervalSec: watch?.intervalSec,
    commentType: watch?.commentType,
    onComment: watch?.onComment,
    onOpen: (pr) => {
      void createPrContainer(repoUrl, pr, containerOptions);
    },
    onClosed: (pr) => {
      void removeContainer(pr.id);
    },
    onMerged: (pr) => {
      void removeContainer(pr.id);
    },
  });

}
