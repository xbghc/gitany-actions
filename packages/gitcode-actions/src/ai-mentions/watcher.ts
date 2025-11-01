import {
  type GitcodeClient,
  type Issue,
  type IssueComment,
  type PRComment,
  type PullRequest,
} from '@xbghc/gitcode-api';
import { createLogger } from '../utils/logger.js';
import { chat } from '../container/index.js';
import { watchIssues, type IssueWatcher } from '../watcher/issue.js';
import { watchPullRequest, type PullRequestWatcher } from '../watcher/pr.js';
import { defaultPromptBuilder } from '../prompt/prompt.js';
import { createAiReplyComment, defaultReplyBodyBuilder, editAiReplyComment } from './reply.js';
import {
  type AiMentionContext,
  type AiMentionSource,
  type AiMentionWatcherHandle,
  type WatchAiMentionsOptions,
  type IssueContext,
  type PrContext,
} from './types.js';

const logger = createLogger('@xbghc/gitcode-actions');

type MentionHandler = (payload: {
  source: AiMentionSource;
  comment: IssueComment | PRComment;
  issueNumber: number;
  issueSnapshot?: Issue;
  pullRequest?: PullRequest;
}) => Promise<void>;

function createMentionHandler(
  client: GitcodeClient,
  repoUrl: string,
  options: WatchAiMentionsOptions,
  loggerPrefix: string,
): MentionHandler {
  const chatExecutor = options.chatExecutor ?? chat;
  const replyEnabled = options.replyWithComment !== false;

  return async (payload) => {
    const { issueNumber, comment, source } = payload;
    if (!Number.isFinite(issueNumber)) return;

    logger.info({ issueNumber, commentId: comment.id, source }, `[${loggerPrefix}] mention detected`);

    let issueDetail: Issue | undefined = payload.issueSnapshot;
    if (!issueDetail) {
      try {
        issueDetail = await client.issue.get(repoUrl, issueNumber);
      } catch (err) {
        logger.error({ err, issueNumber }, `[${loggerPrefix}] failed to load issue detail`);
        return;
      }
    }

    if (!issueDetail) {
      logger.error({ issueNumber }, `[${loggerPrefix}] missing issue detail`);
      return;
    }

    let issueComments: IssueComment[] = [];
    try {
      issueComments = await client.issue.comments(
        repoUrl,
        issueNumber,
        options.issueCommentQuery ?? {},
      );
    } catch (err) {
      logger.warn({ err, issueNumber }, `[${loggerPrefix}] failed to load issue comments`);
    }

    let context: AiMentionContext;
    if (source === 'issue_comment') {
      context = {
        mention: options.mention ?? '@AI',
        repoUrl,
        issueNumber,
        issue: issueDetail,
        mentionComment: comment as IssueComment,
        commentSource: source,
        issueComments,
        pullRequest: undefined,
      } satisfies IssueContext;
    } else if (source === 'pr_review_comment') {
      if (!payload.pullRequest) {
        logger.error({ issueNumber, commentId: comment.id }, `[${loggerPrefix}] missing pull request detail for PR comment`);
        return;
      }
      context = {
        mention: options.mention ?? '@AI',
        repoUrl,
        issueNumber,
        issue: issueDetail,
        mentionComment: comment as PRComment,
        commentSource: source,
        issueComments,
        pullRequest: payload.pullRequest,
      } satisfies PrContext;
    } else {
      // Should not happen
      return;
    }

    if (!replyEnabled) {
      logger.info(`[${loggerPrefix}] reply is disabled, running chat without posting comments.`);
      void (async () => {
        try {
          const prompt = await (options.buildPrompt ?? defaultPromptBuilder)(context);
          if (prompt?.trim()) {
            await chatExecutor(repoUrl, prompt, options.chatOptions);
          }
        } catch (err) {
          logger.error(
            { err, issueNumber, commentId: comment.id },
            `[${loggerPrefix}] background chat invocation failed`,
          );
        }
      })();
      return;
    }

    let placeholderCommentId: number;
    try {
      const placeholder = await createAiReplyComment(
        client,
        repoUrl,
        context,
        '思考中，请稍候... 🤔',
      );
      placeholderCommentId = placeholder.comment.id;
      logger.info(
        { issueNumber, originalCommentId: comment.id, placeholderCommentId },
        `[${loggerPrefix}] created placeholder comment`,
      );
    } catch (err) {
      logger.error(
        { err, issueNumber, commentId: comment.id },
        `[${loggerPrefix}] failed to create placeholder comment`,
      );
      options.onReplyError?.(err, context);
      return;
    }

    void (async () => {
      let prompt: string | undefined;
      try {
        prompt = await (options.buildPrompt ?? defaultPromptBuilder)(context);
        if (!prompt?.trim()) {
          logger.warn(
            { issueNumber },
            `[${loggerPrefix}] empty prompt generated, skipping chat invocation`,
          );
          await editAiReplyComment(
            client,
            repoUrl,
            placeholderCommentId,
            '任务已取消：生成的 Prompt 为空。',
          );
          return;
        }

        const result = await chatExecutor(repoUrl, prompt, options.chatOptions);
        options.onChatResult?.(result, context);

        if (!result.success) {
          throw result.error ?? new Error('Chat execution failed without a specific error.');
        }

        logger.info({ issueNumber, commentId: comment.id }, `[${loggerPrefix}] chat completed`);

        const builder = options.buildReplyBody ?? defaultReplyBodyBuilder;
        const replyBody = (await builder(result, context))?.trim();
        logger.debug({ replyBody }, 'Generated reply body');

        if (!replyBody) {
          logger.warn(
            { issueNumber, commentId: comment.id },
            `[${loggerPrefix}] empty reply body generated, updating placeholder with notice.`,
          );
          await editAiReplyComment(
            client,
            repoUrl,
            placeholderCommentId,
            '任务完成，但无内容可回复。',
          );
          return;
        }

        const finalComment = await editAiReplyComment(
          client,
          repoUrl,
          placeholderCommentId,
          replyBody,
        );
        logger.info(
          { issueNumber, originalCommentId: comment.id, finalCommentId: finalComment.id },
          `[${loggerPrefix}] successfully edited placeholder comment with final answer.`,
        );
        options.onReplyCreated?.(
          {
            source: context.commentSource,
            body: replyBody,
            comment: { id: finalComment.id, body: replyBody },
          },
          context,
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(
          { err, issueNumber, commentId: comment.id, prompt },
          `[${loggerPrefix}] background task failed`,
        );
        try {
          await editAiReplyComment(
            client,
            repoUrl,
            placeholderCommentId,
            `处理失败: ${errorMessage}`,
          );
          options.onReplyError?.(err, context);
        } catch (editErr) {
          logger.error(
            { err: editErr, issueNumber, commentId: comment.id },
            `[${loggerPrefix}] failed to update placeholder with error`,
          );
        }
      }
    })();
  };
}

export function watchAiMentions(
  client: GitcodeClient,
  repoUrl: string,
  options: WatchAiMentionsOptions = {},
): AiMentionWatcherHandle {
  const mentionRegex = createMentionRegex(options.mention ?? '@AI');
  const issueWatchers: IssueWatcher[] = [];
  const prWatchers: PullRequestWatcher[] = [];
  const handleMention = createMentionHandler(client, repoUrl, options, 'watchAiMentions');

  if (options.includeIssueComments !== false) {
    const issueWatcher = watchIssues(client, repoUrl, {
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
    issueWatcher.start();
    issueWatchers.push(issueWatcher);
  }

  if (options.includePullRequestComments !== false) {
    const prWatcher = watchPullRequest(client, repoUrl, {
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
    prWatcher.start();
    prWatchers.push(prWatcher);
  }

  return {
    stop() {
      for (const watcher of issueWatchers) {
        try {
          watcher.stop();
        } catch (err) {
          logger.error({ err }, '[watchAiMentions] failed to stop issue watcher');
        }
      }
      for (const watcher of prWatchers) {
        try {
          watcher.stop();
        } catch (err) {
          logger.error({ err }, '[watchAiMentions] failed to stop PR watcher');
        }
      }
    },
  } satisfies AiMentionWatcherHandle;
}

export async function runAiMentionsOnce(
  client: GitcodeClient,
  repoUrl: string,
  options: WatchAiMentionsOptions = {},
): Promise<void> {
  const mentionRegex = createMentionRegex(options.mention ?? '@AI');
  const mentionHandlerPromises: Promise<void>[] = [];
  const handleMention = createMentionHandler(client, repoUrl, options, 'runAiMentionsOnce');
  const watcherPromises = [];

  if (options.includeIssueComments !== false) {
    const issueWatcher = watchIssues(client, repoUrl, {
      intervalSec: options.issueIntervalSec,
      issueQuery: options.issueQuery,
      commentQuery: options.issueCommentQuery,
      onComment: (issue, comment) => {
        if (!mentionRegex.test(comment.body)) return;
        const issueNumber = Number(issue.number);
        mentionHandlerPromises.push(
          handleMention({
            source: 'issue_comment',
            comment,
            issueNumber,
            issueSnapshot: issue,
          }),
        );
      },
    });
    watcherPromises.push(issueWatcher.runOnce());
  }

  if (options.includePullRequestComments !== false) {
    const prWatcher = watchPullRequest(client, repoUrl, {
      intervalSec: options.prIntervalSec,
      commentType: options.prCommentType,
      onComment: (pr, comment) => {
        if (!mentionRegex.test(comment.body)) return;
        mentionHandlerPromises.push(
          handleMention({
            source: 'pr_review_comment',
            comment,
            issueNumber: pr.number,
            pullRequest: pr,
          }),
        );
      },
    });
    watcherPromises.push(prWatcher.runOnce());
  }

  await Promise.all(watcherPromises);
  await Promise.all(mentionHandlerPromises);
}

function createMentionRegex(mention: string): RegExp {
  const escaped = escapeRegExp(mention.trim());

  // 1. Markdown 链接格式: [@mention](...)
  // 2. 纯文本格式: @mention
  const source = String.raw`(^|\s)(?:\[${escaped}\]\(.*?\)|${escaped}(?=\b))`;

  return new RegExp(source, 'i');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
