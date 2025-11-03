import {
  type GitcodeClient,
  type Issue,
  type IssueComment,
  type PRComment,
  type PullRequest,
} from '@xbghc/gitcode-api';
import { EventEmitter } from 'node:events';
import { chat } from './chat.js';
import { Watcher } from '../watcher/watcher.js';
import { defaultPromptBuilder } from './mention-prompt.js';
import { createReplyComment, defaultReplyBodyBuilder, editReplyComment } from './mention-reply.js';
import type { EventDataMap, EventName } from '../types/events.js';
import {
  type MentionContext,
  type MentionSource,
  type MentionWatcherHandle,
  type WatchMentionsOptions,
  type IssueContext,
  type PrContext,
} from './mention-types.js';

type MentionHandler = (payload: {
  source: MentionSource;
  comment: IssueComment | PRComment;
  issueNumber: number;
  issueSnapshot?: Issue;
  pullRequest?: PullRequest;
}) => Promise<void>;

function createMentionHandler(
  client: GitcodeClient,
  repoUrl: string,
  options: WatchMentionsOptions,
  emitter: EventEmitter,
): MentionHandler {
  const chatExecutor = options.chatExecutor ?? chat;
  const replyEnabled = options.replyWithComment !== false;

  const emitEvent = <K extends EventName>(event: K, data: Omit<EventDataMap[K], 'timestamp'>): void => {
    const eventData = { ...data, timestamp: new Date() } as EventDataMap[K];
    emitter.emit(event, eventData);
  };

  return async (payload) => {
    const { issueNumber, comment, source } = payload;
    if (!Number.isFinite(issueNumber)) return;

    emitEvent('mention:detected', { issueNumber, commentId: comment.id, source });

    let issueDetail: Issue | undefined = payload.issueSnapshot;
    if (!issueDetail) {
      try {
        issueDetail = await client.issue.get(repoUrl, issueNumber);
      } catch (err) {
        emitEvent('mention:issue-detail:load:failed', { issueNumber, error: err });
        return;
      }
    }

    if (!issueDetail) {
      emitEvent('mention:issue-detail:missing', { issueNumber });
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
      emitEvent('mention:comments:load:warn', { issueNumber, error: err });
    }

    let context: MentionContext;
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
        emitEvent('mention:pr-detail:missing', { issueNumber, commentId: comment.id });
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
      emitEvent('mention:reply:disabled', {});
      void (async () => {
        try {
          const prompt = await (options.buildPrompt ?? defaultPromptBuilder)(context);
          if (prompt?.trim()) {
            await chatExecutor(repoUrl, prompt, options.chatOptions);
          }
        } catch (err) {
          emitEvent('mention:background-chat:failed', { error: err, issueNumber, commentId: comment.id });
        }
      })();
      return;
    }

    let placeholderCommentId: number;
    try {
      const placeholder = await createReplyComment(
        client,
        repoUrl,
        context,
        '思考中，请稍候... 🤔',
      );
      placeholderCommentId = placeholder.comment.id;
      emitEvent('mention:placeholder:created', {
        issueNumber,
        originalCommentId: comment.id,
        placeholderCommentId,
      });
    } catch (err) {
      emitEvent('mention:placeholder:create:failed', {
        error: err,
        issueNumber,
        commentId: comment.id,
      });
      return;
    }

    void (async () => {
      let prompt: string | undefined;
      try {
        prompt = await (options.buildPrompt ?? defaultPromptBuilder)(context);
        if (!prompt?.trim()) {
          emitEvent('mention:prompt:empty:warn', { issueNumber });
          await editReplyComment(
            client,
            repoUrl,
            placeholderCommentId,
            '任务已取消：生成的 Prompt 为空。',
          );
          return;
        }

        const result = await chatExecutor(repoUrl, prompt, options.chatOptions);

        if (!result.success) {
          throw result.error ?? new Error('Chat execution failed without a specific error.');
        }

        emitEvent('mention:chat:completed', { issueNumber, commentId: comment.id });

        const builder = options.buildReplyBody ?? defaultReplyBodyBuilder;
        const replyBody = (await builder(result, context))?.trim();
        emitEvent('mention:reply:generated', { replyBody: replyBody || '' });

        if (!replyBody) {
          emitEvent('mention:reply:empty:warn', { issueNumber, commentId: comment.id });
          await editReplyComment(
            client,
            repoUrl,
            placeholderCommentId,
            '任务完成，但无内容可回复。',
          );
          return;
        }

        const finalComment = await editReplyComment(
          client,
          repoUrl,
          placeholderCommentId,
          replyBody,
        );
        emitEvent('mention:reply:edited', {
          issueNumber,
          originalCommentId: comment.id,
          finalCommentId: finalComment.id,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        emitEvent('mention:background-task:failed', {
          error: err,
          issueNumber,
          commentId: comment.id,
          prompt,
        });
        try {
          await editReplyComment(
            client,
            repoUrl,
            placeholderCommentId,
            `处理失败: ${errorMessage}`,
          );
        } catch (editErr) {
          emitEvent('mention:placeholder:update:failed', {
            error: editErr,
            issueNumber,
            commentId: comment.id,
          });
        }
      }
    })();
  };
}

/**
 * 监听仓库中的提及（Mention）
 *
 * @deprecated Mention 功能将在未来版本通过个人通知 API 实现
 * 当前版本仍可使用，但不推荐用于新项目
 */
export function watchMentions(
  client: GitcodeClient,
  repoUrl: string,
  options: WatchMentionsOptions = {},
): MentionWatcherHandle {
  const mentionRegex = createMentionRegex(options.mention ?? '@AI');
  const watchers: Array<{ watcher: Watcher; type: 'issue' | 'pr' }> = [];
  const emitter = new EventEmitter();
  const handleMention = createMentionHandler(client, repoUrl, options, emitter);

  const emitEvent = <K extends EventName>(event: K, data: Omit<EventDataMap[K], 'timestamp'>): void => {
    const eventData = { ...data, timestamp: new Date() } as EventDataMap[K];
    emitter.emit(event, eventData);
  };

  if (options.includeIssueComments !== false) {
    const issueWatcher = new Watcher(client, repoUrl, {
      issue: {
        intervalSec: options.issueIntervalSec,
        issueQuery: options.issueQuery,
        commentQuery: options.issueCommentQuery,
      },
    });

    issueWatcher.on('issue:comment:created', ({ issue, comment }) => {
      if (!mentionRegex.test(comment.body)) return;
      const issueNumber = Number(issue.number);
      void handleMention({
        source: 'issue_comment',
        comment,
        issueNumber,
        issueSnapshot: issue,
      });
    });

    issueWatcher.start();
    watchers.push({ watcher: issueWatcher, type: 'issue' });
  }

  if (options.includePullRequestComments !== false) {
    const prWatcher = new Watcher(client, repoUrl, {
      pr: {
        intervalSec: options.prIntervalSec,
        commentType: options.prCommentType,
      },
    });

    prWatcher.on('pr:comment:created', ({ pr, comment }) => {
      if (!mentionRegex.test(comment.body)) return;
      void handleMention({
        source: 'pr_review_comment',
        comment,
        issueNumber: pr.number,
        pullRequest: pr,
      });
    });

    prWatcher.start();
    watchers.push({ watcher: prWatcher, type: 'pr' });
  }

  return Object.assign(emitter, {
    stop() {
      for (const { watcher, type } of watchers) {
        try {
          watcher.stop();
        } catch (err) {
          emitEvent('mention:watcher:stop:failed', { error: err, watcherType: type });
        }
      }
    },
  }) as MentionWatcherHandle;
}

/**
 * 手动运行一次 Mention 检测
 *
 * @deprecated Mention 功能将在未来版本通过个人通知 API 实现
 * 当前版本仍可使用，但不推荐用于新项目
 */
export async function runMentionsOnce(
  client: GitcodeClient,
  repoUrl: string,
  options: WatchMentionsOptions = {},
): Promise<void> {
  const mentionRegex = createMentionRegex(options.mention ?? '@AI');
  const mentionHandlerPromises: Promise<void>[] = [];
  const emitter = new EventEmitter();
  const handleMention = createMentionHandler(client, repoUrl, options, emitter);
  const watcherPromises = [];

  if (options.includeIssueComments !== false) {
    const issueWatcher = new Watcher(client, repoUrl, {
      issue: {
        intervalSec: options.issueIntervalSec,
        issueQuery: options.issueQuery,
        commentQuery: options.issueCommentQuery,
      },
    });

    issueWatcher.on('issue:comment:created', ({ issue, comment }) => {
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
    });

    watcherPromises.push(issueWatcher.runOnce());
  }

  if (options.includePullRequestComments !== false) {
    const prWatcher = new Watcher(client, repoUrl, {
      pr: {
        intervalSec: options.prIntervalSec,
        commentType: options.prCommentType,
      },
    });

    prWatcher.on('pr:comment:created', ({ pr, comment }) => {
      if (!mentionRegex.test(comment.body)) return;
      mentionHandlerPromises.push(
        handleMention({
          source: 'pr_review_comment',
          comment,
          issueNumber: pr.number,
          pullRequest: pr,
        }),
      );
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
