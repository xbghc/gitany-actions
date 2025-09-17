import {
  type GitcodeClient,
  type Issue,
  type IssueComment,
  type PRComment,
  type PullRequest,
} from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import type Docker from 'dockerode';
import { chat, createChatContainer } from '../container';
import { watchIssues, type WatchIssueHandle } from '../issue/watcher';
import { watchPullRequest, type WatchPullRequestHandle } from '../pr/watcher';
import { defaultPromptBuilder } from './prompt';
import { createAiReplyComment, defaultReplyBodyBuilder } from './reply';
import {
  type AiMentionContext,
  type AiMentionSource,
  type AiMentionWatcherHandle,
  type WatchAiMentionsOptions,
} from './types';

const logger = createLogger('@gitany/core');

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
  const replyEnabled = options.replyWithComment !== false;
  const useSharedContainer = options.useSharedContainer ?? false;

  let containerPromise: Promise<Docker.Container> | undefined;
  if (useSharedContainer) {
    containerPromise = createChatContainer({
      repoUrl,
      sha: options.chatOptions?.sha,
      nodeVersion: options.chatOptions?.nodeVersion,
      npmRegistry: options.chatOptions?.npmRegistry,
      pnpmRegistry: options.chatOptions?.pnpmRegistry,
      verbose: options.chatOptions?.verbose,
    });
    containerPromise.catch((err) => {
      logger.error({ err }, '[watchAiMentions] failed to create shared container');
    });
  }

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
      let container: Docker.Container | undefined;
      if (containerPromise) {
        try {
          container = await containerPromise;
        } catch (err) {
          logger.error({ err, issueNumber, commentId: comment.id }, '[watchAiMentions] shared container is not available');
          // Optionally, decide if you want to fallback to creating a new container or just fail.
          // For now, we'll just fail.
          return;
        }
      }

      const chatOptions = { ...options.chatOptions, container };
      const result = await chatExecutor(repoUrl, prompt, chatOptions);

      options.onChatResult?.(result, context);
      if (!result.success) {
        logger.error({ issueNumber, commentId: comment.id, error: result.error }, '[watchAiMentions] chat failed');
      } else {
        logger.info({ issueNumber, commentId: comment.id }, '[watchAiMentions] chat completed');
        if (replyEnabled) {
          let replyBody: string | null | undefined;
          try {
            const builder = options.buildReplyBody ?? defaultReplyBodyBuilder;
            replyBody = await builder(result, context);
          } catch (err) {
            logger.error({ err, issueNumber, commentId: comment.id }, '[watchAiMentions] failed to build reply body');
            options.onReplyError?.(err, context);
            return;
          }

          const trimmed = replyBody?.trim();
          if (!trimmed) {
            logger.warn(
              { issueNumber, commentId: comment.id },
              '[watchAiMentions] empty reply body generated, skip comment creation',
            );
            return;
          }

          try {
            const reply = await createAiReplyComment(client, repoUrl, context, trimmed);
            options.onReplyCreated?.(reply, context);
            logger.info(
              {
                issueNumber,
                commentId: comment.id,
                replyId: reply.comment.id,
                replySource: reply.source,
              },
              '[watchAiMentions] reply comment created',
            );
          } catch (err) {
            logger.error({ err, issueNumber, commentId: comment.id }, '[watchAiMentions] failed to post reply');
            options.onReplyError?.(err, context);
          }
        }
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

  const stop = async () => {
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
    if (containerPromise) {
      try {
        const container = await containerPromise;
        await container.remove({ force: true });
        logger.info('[watchAiMentions] shared container removed');
      } catch (err) {
        logger.error({ err }, '[watchAiMentions] failed to remove shared container');
      }
    }
  };

  return {
    stop() {
      void stop();
    },
  } satisfies AiMentionWatcherHandle;
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
