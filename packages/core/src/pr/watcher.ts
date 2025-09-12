import { GitcodeClient, PullRequest } from '@gitany/gitcode';

interface WatchPullRequestOptions {
  onClosed?: (pr: PullRequest) => void;
  onOpen?: (pr: PullRequest) => void;
  onMerged?: (pr: PullRequest) => void;
}

export function watchPullRequest(
  client: GitcodeClient,
  url: string,
  options: WatchPullRequestOptions,
) {
  let prList: PullRequest[] = [];

  const idExists = (id: number) => {
    return prList.find((p) => p.id === id);
  };

  const stateChanged = (pr: PullRequest) => {
    const existingPr = prList.find((p) => p.id === pr.id);
    return existingPr && existingPr.state !== pr.state;
  };

  const check = async () => {
    const newList = await client.pr.list(url, { state: 'all', page: 1, per_page: 10 });
    for (const pr of newList) {
      if (!idExists(pr.id) || stateChanged(pr)) {
        triggerPullRequestEvent(pr, options);
      }
    }

    prList = newList;
  };

  const intervalId = setInterval(() => {
    check();
  }, 5000);

  return () => {
    clearInterval(intervalId);
  };
}

export function triggerPullRequestEvent(pr: PullRequest, options: WatchPullRequestOptions) {
  const { onClosed, onMerged, onOpen } = options;
  if (onOpen && pr.state === 'open') {
    onOpen(pr);
  } else if (onClosed && pr.state === 'closed') {
    onClosed(pr);
  } else if (onMerged && pr.state === 'merged') {
    onMerged(pr);
  }
}
