import type { PullRequest } from '@gitany/gitcode';
import {
  runPrInContainer,
  resetPrContainer,
  removePrContainer,
  getPrContainer,
} from '@gitany/core';
import type Docker from 'dockerode';

export interface PullRequestEvent {
  action: 'opened' | 'synchronize' | 'closed';
  pull_request: PullRequest;
}

export class PnpmActions {
  constructor(private repoUrl: string) {}

  async handle(event: PullRequestEvent) {
    const pr = event.pull_request;
    switch (event.action) {
      case 'opened':
        await runPrInContainer(this.repoUrl, pr);
        break;
      case 'synchronize':
        await resetPrContainer(this.repoUrl, pr);
        await runPrInContainer(this.repoUrl, pr);
        break;
      case 'closed':
        await removePrContainer(pr.id);
        break;
    }
  }

  getContainer(prId: number): Docker.Container | null {
    return getPrContainer(prId);
  }
}
