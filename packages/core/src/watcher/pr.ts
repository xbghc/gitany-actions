import { type GitcodeClient, type ListPullsQuery, parseGitUrl, type PRCommentQueryOptions } from '@gitany/gitcode';
import { EventEmitter } from 'events';

export class PrWatcher extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  private lastFetchTime: Date | null = null;
  private seenPrs: Set<number> = new Set();
  private owner: string;
  private repo: string;

  constructor(
    private client: GitcodeClient,
    private url: string,
    private pollIntervalSeconds: number = 60,
  ) {
    super();
    const parsed = parseGitUrl(url);
    if (!parsed) {
      throw new Error(`Invalid repo URL: ${url}`);
    }
    this.owner = parsed.owner;
    this.repo = parsed.repo;
  }

  start() {
    if (this.interval) {
      this.stop();
    }
    this.lastFetchTime = new Date();
    this.interval = setInterval(() => this.poll(), this.pollIntervalSeconds * 1000);
    this.poll(); // Poll immediately on start
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async poll() {
    try {
      const prs = await this.listPrs({ state: 'open', sort: 'updated' });
      const newPrs = prs.filter(
        (pr) => !this.seenPrs.has(pr.id)
      );

      if (newPrs.length > 0) {
        this.emit('new-prs', newPrs);
        newPrs.forEach((pr) => this.seenPrs.add(pr.id));
      }

      this.lastFetchTime = new Date();
    } catch (error) {
      this.emit('error', error);
    }
  }

  async listPrs(query: ListPullsQuery) {
    return this.client.pulls.list({
      owner: this.owner,
      repo: this.repo,
      query,
    });
  }

  async listComments(prNumber: number, query?: PRCommentQueryOptions) {
    const data = await this.client.pulls.listComments({
      owner: this.owner,
      repo: this.repo,
      prNumber,
      query,
    });
    return data ?? [];
  }
}
