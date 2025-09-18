import type {
  CreatedIssueComment,
  CreatedPrComment,
  Issue,
  IssueComment,
  IssueCommentsQuery,
  ListIssuesQuery,
  PRComment,
  PullRequest,
} from '@gitany/gitcode';
import type { ChatOptions, ChatResult } from '../container';

export type AiMentionSource = 'issue_comment' | 'pr_review_comment';

export interface IssueContext {
  repoUrl: string;
  issueNumber: number;
  issue: Issue;
  mentionComment: IssueComment;
  commentSource: 'issue_comment';
  issueComments: IssueComment[];
  pullRequest: undefined;
}

export interface PrContext {
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
  onChatResult?: (result: ChatResult, context: AiMentionContext) => void;
  includeIssueComments?: boolean;
  includePullRequestComments?: boolean;
  /** Whether to automatically reply to the mention with the chat output. Defaults to true. */
  replyWithComment?: boolean;
  /** Customizes the body used when posting the AI reply comment. */
  buildReplyBody?: BuildAiMentionReplyBody;
  /** Invoked after the AI reply comment has been created. */
  onReplyCreated?: (reply: AiMentionReply, context: AiMentionContext) => void;
  /** Invoked when posting the AI reply fails. */
  onReplyError?: (error: unknown, context: AiMentionContext) => void;
}

export interface AiMentionWatcherHandle {
  stop(): void;
}
