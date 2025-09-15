import type {
  GitcodeClient,
  Issue,
  IssueComment,
  PullRequest,
  PRComment,
  ListIssuesQuery,
  IssueCommentsQuery,
} from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { chat, type ChatOptions, type ChatResult } from '../container';
import { watchIssues, type WatchIssueHandle } from './watcher';
import { watchPullRequest, type WatchPullRequestHandle } from '../pr/watcher';

const logger = createLogger('@gitany/core');

export type AiMentionSource = 'issue_comment' | 'pr_review_comment';

export interface AiMentionContext {
  repoUrl: string;
  issueNumber: number;
  issue: Issue;
  mentionComment: IssueComment | PRComment;
  commentSource: AiMentionSource;
  issueComments: IssueComment[];
  pullRequest?: PullRequest;
}

export interface WatchAiMentionsOptions {
  mention?: string;
  issueIntervalSec?: number;
  prIntervalSec?: number;
  issueQuery?: ListIssuesQuery;
  issueCommentQuery?: IssueCommentsQuery;
  prCommentType?: 'diff_comment' | 'pr_comment';
  chatOptions?: ChatOptions;
  chatExecutor?: (repoUrl: string, prompt: string, options?: ChatOptions) => Promise<ChatResult>;
  buildPrompt?: (context: AiMentionContext) => string | Promise<string>;
  onChatResult?: (result: ChatResult, context: AiMentionContext) => void;
  includeIssueComments?: boolean;
  includePullRequestComments?: boolean;
}

export interface AiMentionWatcherHandle {
  stop(): void;
}

export function watchAiMentions(
  client: GitcodeClient,
  repoUrl: string,
  options: WatchAiMentionsOptions = {},
): AiMentionWatcherHandle {
  const mentionToken = options.mention ?? '@AI';
  const mentionRegex = createMentionRegex(mentionToken);
  const chatExecutor = options.chatExecutor ?? chat;
  const issueHandles: WatchIssueHandle[] = [];
  const prHandles: WatchPullRequestHandle[] = [];

  const handleMention = async (
    payload: {
      source: AiMentionSource;
      comment: IssueComment | PRComment;
      issueNumber: number;
      issueSnapshot?: Issue;
      pullRequest?: PullRequest;
    },
  ) => {
    const { issueNumber, comment, source } = payload;
    if (!Number.isFinite(issueNumber)) return;

    logger.info({ issueNumber, commentId: comment.id, source }, '[watchAiMentions] mention detected');

    let issueDetail: Issue | undefined = payload.issueSnapshot;
    if (!issueDetail) {
      try {
        issueDetail = await client.issue.get(repoUrl, issueNumber);
      } catch (err) {
        logger.error({ err, issueNumber }, '[watchAiMentions] failed to load issue detail');
        return;
      }
    }

    if (!issueDetail) {
      logger.error({ issueNumber }, '[watchAiMentions] missing issue detail');
      return;
    }

    let issueComments: IssueComment[] = [];
    try {
      issueComments = await client.issue.comments(repoUrl, issueNumber, options.issueCommentQuery ?? {});
    } catch (err) {
      logger.warn({ err, issueNumber }, '[watchAiMentions] failed to load issue comments');
    }

    const context: AiMentionContext = {
      repoUrl,
      issueNumber,
      issue: issueDetail,
      mentionComment: comment,
      commentSource: source,
      issueComments,
      pullRequest: payload.pullRequest,
    };

    let prompt: string;
    try {
      const builder = options.buildPrompt ?? defaultPromptBuilder;
      prompt = await builder(context);
    } catch (err) {
      logger.error({ err, issueNumber }, '[watchAiMentions] failed to build prompt');
      return;
    }

    if (!prompt?.trim()) {
      logger.warn({ issueNumber }, '[watchAiMentions] empty prompt generated, skip chat invocation');
      return;
    }

    try {
      const result = await chatExecutor(repoUrl, prompt, options.chatOptions);
      options.onChatResult?.(result, context);
      if (!result.success) {
        logger.error({ issueNumber, commentId: comment.id, error: result.error }, '[watchAiMentions] chat failed');
      } else {
        logger.info({ issueNumber, commentId: comment.id }, '[watchAiMentions] chat completed');
      }
    } catch (err) {
      logger.error({ err, issueNumber, commentId: comment.id }, '[watchAiMentions] chat invocation failed');
    }
  };

  if (options.includeIssueComments !== false) {
    const issueHandle = watchIssues(client, repoUrl, {
      intervalSec: options.issueIntervalSec,
      issueQuery: options.issueQuery,
      commentQuery: options.issueCommentQuery,
      onComment: (issue, comment) => {
        if (!mentionRegex.test(comment.body)) return;
        const issueNumber = Number(issue.number);
        void handleMention({
          source: 'issue_comment',
          comment,
          issueNumber,
          issueSnapshot: issue,
        });
      },
    });
    issueHandles.push(issueHandle);
  }

  if (options.includePullRequestComments !== false) {
    const prHandle = watchPullRequest(client, repoUrl, {
      intervalSec: options.prIntervalSec,
      commentType: options.prCommentType,
      onComment: (pr, comment) => {
        if (!mentionRegex.test(comment.body)) return;
        void handleMention({
          source: 'pr_review_comment',
          comment,
          issueNumber: pr.number,
          pullRequest: pr,
        });
      },
    });
    prHandles.push(prHandle);
  }

  return {
    stop() {
      for (const handle of issueHandles) {
        try {
          handle.stop();
        } catch (err) {
          logger.error({ err }, '[watchAiMentions] failed to stop issue watcher');
        }
      }
      for (const handle of prHandles) {
        try {
          handle.stop();
        } catch (err) {
          logger.error({ err }, '[watchAiMentions] failed to stop PR watcher');
        }
      }
    },
  } satisfies AiMentionWatcherHandle;
}

function createMentionRegex(mention: string): RegExp {
  const escaped = escapeRegExp(mention.trim());
  const source = String.raw`(^|\s)${escaped}(?=\b)`;
  return new RegExp(source, 'i');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function defaultPromptBuilder(context: AiMentionContext): string {
  const { issue, issueComments, mentionComment, commentSource, repoUrl } = context;
  const lines: string[] = [];
  lines.push('You are an AI assistant helping with GitCode issues and pull requests.');
  lines.push(`Repository: ${repoUrl}`);
  lines.push(`Issue #${issue.number}: ${issue.title}`);

  const issueBody = issue.body?.trim();
  if (issueBody) {
    lines.push(`Issue description:\n${issueBody}`);
  } else {
    lines.push('Issue description: (not provided)');
  }

  const history = issueComments
    .filter((c) => c.id !== mentionComment.id)
    .slice(-5)
    .map((c) => c.body.trim())
    .filter(Boolean);
  if (history.length) {
    lines.push('Recent comments:');
    for (const entry of history) {
      lines.push(entry);
    }
  }

  lines.push(
    commentSource === 'pr_review_comment'
      ? 'Pull request review comment mentioning @AI:'
      : 'Issue comment mentioning @AI:',
  );
  lines.push(mentionComment.body);
  lines.push('Provide a helpful answer or recommended next steps for the maintainers.');

  return lines.join('\n\n');
}
