import type {
  CreatedIssueComment,
  CreatedPrComment,
  Issue,
  IssueComment,
  IssueCommentsQuery,
  ListIssuesQuery,
  PRComment,
  PullRequest,
} from '@xbghc/gitcode-api';
import type { EventEmitter } from 'node:events';
import type { ChatOptions, ChatResult } from '../container/index.js';

export type AiMentionSource = 'issue_comment' | 'pr_review_comment';

export interface IssueContext {
  mention: string;
  repoUrl: string;
  issueNumber: number;
  issue: Issue;
  mentionComment: IssueComment;
  commentSource: 'issue_comment';
  issueComments: IssueComment[];
  pullRequest: undefined;
}

export interface PrContext {
  mention: string;
  repoUrl: string;
  issueNumber: number; // This is the PR number
  issue: Issue; // A PR is also an issue, so this is still needed for body etc.
  mentionComment: PRComment;
  commentSource: 'pr_review_comment';
  issueComments: IssueComment[]; // These are the PR comments
  pullRequest: PullRequest; // This is now mandatory
}

export type AiMentionContext = IssueContext | PrContext;

export type AiMentionReply =
  | {
      source: 'issue_comment';
      body: string;
      comment: CreatedIssueComment;
    }
  | {
      source: 'pr_review_comment';
      body: string;
      comment: CreatedPrComment;
    };

export type BuildAiMentionPrompt = (context: AiMentionContext) => string | Promise<string>;

export type BuildAiMentionReplyBody = (
  result: ChatResult,
  context: AiMentionContext,
) => string | Promise<string | null | undefined>;

export interface WatchAiMentionsOptions {
  mention?: string;
  issueIntervalSec?: number;
  prIntervalSec?: number;
  issueQuery?: ListIssuesQuery;
  issueCommentQuery?: IssueCommentsQuery;
  prCommentType?: 'diff_comment' | 'pr_comment';
  chatOptions?: ChatOptions;
  chatExecutor?: (repoUrl: string, prompt: string, options?: ChatOptions) => Promise<ChatResult>;
  buildPrompt?: BuildAiMentionPrompt;
  includeIssueComments?: boolean;
  includePullRequestComments?: boolean;
  /** Whether to automatically reply to the mention with the chat output. Defaults to true. */
  replyWithComment?: boolean;
  /** Customizes the body used when posting the AI reply comment. */
  buildReplyBody?: BuildAiMentionReplyBody;
}

export interface AiMentionWatcherHandle extends EventEmitter {
  stop(): void;
}
