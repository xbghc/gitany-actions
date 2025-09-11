import { GitcodeClient, PullRequest, PRComment } from '@gitany/gitcode';

interface WatchPullRequestOptions {
  onClosed?: (pr: PullRequest) => void;
  onOpen?: (pr: PullRequest) => void;
  onMerged?: (pr: PullRequest) => void;
  onComment?: (pr: PullRequest, comment: PRComment) => void;
  intervalMs?: number; // TODO 单位修改为秒
}

// 实现监听PR的评论，并拆分为多个内部模块，简化主函数
// TODO 实现存储持久化，这样下一次打开程序时可以判断哪些是新增的。
export function watchPullRequest(
  client: GitcodeClient,
  url: string,
  options: WatchPullRequestOptions,
) {
  const state = createWatcherState();

  const check = async () => {
    const newList = await fetchPullRequests(client, url);
    detectPrEvents(newList, state, options);
    await detectCommentEvents(client, url, newList, state, options);
    state.prList = newList;
  };

  // 立即进行一次检查以尽快建立基线
  void check();

  const intervalId = setInterval(() => void check(), options.intervalMs ?? 5000);
  return () => clearInterval(intervalId);
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

// -------- Internal helpers --------

type WatcherState = {
  prList: PullRequest[];
  lastCommentIdByPr: Map<number, number>; // pr.number -> last seen comment id
};


function createWatcherState(): WatcherState {
  return { prList: [], lastCommentIdByPr: new Map() };
}

async function fetchPullRequests(client: GitcodeClient, url: string) {
  return await client.pr.list(url, { state: 'all', page: 1, per_page: 10 });
}

function detectPrEvents(
  newList: PullRequest[],
  state: WatcherState,
  options: WatchPullRequestOptions,
) {
  const prev = state.prList;
  for (const pr of newList) {
    const existed = prev.find((p) => p.id === pr.id);
    if (!existed) {
      // 新增 PR（首次看到）。按当前状态触发一次回调
      triggerPullRequestEvent(pr, options);
      continue;
    }
    if (existed.state !== pr.state) {
      triggerPullRequestEvent(pr, options);
    }
  }
}

async function detectCommentEvents(
  client: GitcodeClient,
  url: string,
  newList: PullRequest[],
  state: WatcherState,
  options: WatchPullRequestOptions,
) {
  if (!options.onComment) return;

  for (const pr of newList) {
    // 仅对打开的 PR 拉取评论，减少请求
    if (pr.state !== 'open') continue;

    const comments = await fetchPrComments(client, url, pr.number);
    if (!comments.length) continue;

    const lastSeen = state.lastCommentIdByPr.get(pr.number);
    if (lastSeen === undefined) {
      // 首次建立基线：记录最新的评论 ID，避免历史评论触发
      state.lastCommentIdByPr.set(pr.number, comments[0].id);
      continue;
    }

    // 触发新增评论（按时间/ID 降序返回时，> lastSeen 即为新评论）
    let maxId = lastSeen;
    for (let i = comments.length - 1; i >= 0; i--) {
      const c = comments[i];
      if (c.id > lastSeen) {
        options.onComment?.(pr, c);
        if (c.id > maxId) maxId = c.id;
      }
    }
    if (maxId !== lastSeen) {
      state.lastCommentIdByPr.set(pr.number, maxId);
    }
  }
}

// 使用 client 的 PR 评论接口，与 issue 无关
async function fetchPrComments(
  client: GitcodeClient,
  url: string,
  prNumber: number,
): Promise<PRComment[]> {
  // 仅拉取普通 PR 评论（非 diff 评论），减少数据量
  return await client.pr.comments(url, prNumber, { comment_type: 'pr_comment' });
}
