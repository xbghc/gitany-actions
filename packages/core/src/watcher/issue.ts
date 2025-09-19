import { type GitcodeClient, type ListIssuesQuery, parseGitUrl, type IssueCommentsQuery } from '@gitany/gitcode';
import { EventEmitter } from 'events';

export class IssueWatcher extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  private lastFetchTime: Date | null = null;
  private seenIssues: Set<number> = new Set();
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
      const issues = await this.listIssues({ state: 'open', sort: 'updated' });
      const newIssues = issues.filter(
        (issue) => !this.seenIssues.has(issue.id)
      );

      if (newIssues.length > 0) {
        this.emit('new-issues', newIssues);
        newIssues.forEach((issue) => this.seenIssues.add(issue.id));
      }

      this.lastFetchTime = new Date();
    } catch (error) {
      this.emit('error', error);
    }
  }

  async listIssues(query: ListIssuesQuery) {
    return this.client.issues.list({
      owner: this.owner,
      repo: this.repo,
      query,
    });
  }

  async listComments(issueNumber: number, query?: IssueCommentsQuery) {
    const data = await this.client.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issueNumber,
      query,
    });
    return data ?? [];
  }
}
