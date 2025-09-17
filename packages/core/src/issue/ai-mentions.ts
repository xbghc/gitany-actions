import {
  type GitcodeClient,
  type Issue,
  type IssueComment,
  type PullRequest,
  type PRComment,
  type ListIssuesQuery,
  type IssueCommentsQuery,
  type CreatedIssueComment,
  type CreatedPrComment,
  parseGitUrl,
} from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';
import { chat, type ChatOptions, type ChatResult } from '../container';
import { watchIssues, type WatchIssueHandle } from './watcher';
import { watchPullRequest, type WatchPullRequestHandle } from '../pr/watcher';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const logger = createLogger('@gitany/core');
const require = createRequire(import.meta.url);

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
  /** Whether to automatically reply to the mention with the chat output. Defaults to true. */
  replyWithComment?: boolean;
  /** Customizes the body used when posting the AI reply comment. */
  buildReplyBody?: (
    result: ChatResult,
    context: AiMentionContext,
  ) => string | Promise<string | null | undefined>;
  /** Invoked after the AI reply comment has been created. */
  onReplyCreated?: (reply: AiMentionReply, context: AiMentionContext) => void;
  /** Invoked when posting the AI reply fails. */
  onReplyError?: (error: unknown, context: AiMentionContext) => void;
}

export interface AiMentionWatcherHandle {
  stop(): void;
}

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
    if (!Number.isFinite(issueNumber)) {
      logger.warn({ issueNumber }, '[watchAiMentions] invalid issue number');
      return;
    }

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
        if (!mentionRegex.test(comment.body)) {
          logger.info({ issueNumber: issue.number, commentId: comment.id }, '[watchAiMentions] comment does not mention AI');
          return;
        };
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

/**
 * 在容器中调用 gitcode CLI 创建评论
 */
async function createAiReplyComment(
  client: GitcodeClient,
  repoUrl: string,
  context: AiMentionContext,
  body: string,
): Promise<AiMentionReply> {
  const parsed = parseGitUrl(repoUrl);
  if (!parsed) {
    throw new Error(`Invalid repository URL: ${repoUrl}`);
  }

  const repoArg = `${parsed.owner}/${parsed.repo}`;
  const token = (await client.auth.token())?.trim();
  const cliEnv: NodeJS.ProcessEnv = {};
  if (token) {
    cliEnv.GITCODE_TOKEN = token;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcode-cli-'));

  try {
    const bodyFile = path.join(tempDir, `${randomUUID()}.md`);
    await fs.writeFile(bodyFile, body, 'utf8');

    if (context.commentSource === 'issue_comment') {
      const args = [
        'issue',
        'comment',
        String(context.issueNumber),
        '--body-file',
        bodyFile,
        '--repo',
        repoArg,
        '--json',
      ];
      const { stdout } = await runGitcodeCli(args, { env: cliEnv });
      const text = stdout.trim();
      if (!text) {
        throw new Error('gitcode CLI returned empty output when creating issue comment');
      }
      const comment = JSON.parse(text) as CreatedIssueComment;
      return { source: 'issue_comment', body, comment } satisfies AiMentionReply;
    }

    const prNumber = context.pullRequest?.number ?? context.issueNumber;
    if (!Number.isFinite(prNumber)) {
      throw new Error(`Invalid pull request number: ${prNumber}`);
    }
    const args = [
      'pr',
      'comment',
      String(prNumber),
      '--body-file',
      bodyFile,
      '--repo',
      repoArg,
      '--json',
    ];
    const { stdout } = await runGitcodeCli(args, { env: cliEnv });
    const text = stdout.trim();
    if (!text) {
      throw new Error('gitcode CLI returned empty output when creating PR comment');
    }
    const comment = JSON.parse(text) as CreatedPrComment;
    return { source: 'pr_review_comment', body, comment } satisfies AiMentionReply;
  } finally {
    await removeTempDir(tempDir);
  }
}

function defaultReplyBodyBuilder(result: ChatResult): string | null {
  const text = result.output?.trim();
  return text && text.length > 0 ? text : null;
}

export function defaultPromptBuilder(context: AiMentionContext): string {
  const { issue, issueComments, mentionComment, commentSource, repoUrl, pullRequest } = context;
  const lines: string[] = [];
  const isPrReviewComment = commentSource === 'pr_review_comment';

  lines.push('You are an AI assistant helping with GitCode issues and pull requests.');
  lines.push(`Repository: ${repoUrl}`);

  if (isPrReviewComment && pullRequest) {
    const title = pullRequest.title?.trim() || issue.title;
    lines.push(`Pull request #${pullRequest.number}: ${title}`);

    const prState = pullRequest.state?.trim();
    if (prState) {
      lines.push(`Pull request state: ${prState}`);
    }

    const baseBranch = formatBranchReference(pullRequest.base);
    const headBranch = formatBranchReference(pullRequest.head);
    if (baseBranch || headBranch) {
      const branchLines: string[] = [];
      if (baseBranch) branchLines.push(`Base branch: ${baseBranch}`);
      if (headBranch) branchLines.push(`Compare branch: ${headBranch}`);
      lines.push(branchLines.join('\n'));
    }

    const description = issue.body?.trim();
    if (description) {
      lines.push(`Pull request description:\n${description}`);
    } else {
      lines.push('Pull request description: (not provided)');
    }
  } else {
    lines.push(`Issue #${issue.number}: ${issue.title}`);

    const issueBody = issue.body?.trim();
    if (issueBody) {
      lines.push(`Issue description:\n${issueBody}`);
    } else {
      lines.push('Issue description: (not provided)');
    }
  }

  const history = issueComments
    .filter((c) => c.id !== mentionComment.id)
    .slice(-5)
    .map((c) => c.body.trim())
    .filter(Boolean);
  if (history.length) {
    lines.push(isPrReviewComment && pullRequest ? 'Recent pull request comments:' : 'Recent comments:');
    for (const entry of history) {
      lines.push(entry);
    }
  }

  if (isPrReviewComment && pullRequest) {
    const prComment = mentionComment as PRComment & { path?: string; diff_hunk?: string };
    const filePath = typeof prComment.path === 'string' ? prComment.path.trim() : '';
    const diffHunk = typeof prComment.diff_hunk === 'string' ? prComment.diff_hunk.trim() : '';
    if (filePath) {
      lines.push(`File: ${filePath}`);
    }
    if (diffHunk) {
      lines.push(`Code context:\n${diffHunk}`);
    }
  }

  lines.push(
    isPrReviewComment
      ? 'Pull request review comment mentioning @AI:'
      : 'Issue comment mentioning @AI:',
  );
  lines.push(mentionComment.body);
  lines.push('Provide a helpful answer or recommended next steps for the maintainers.');
  lines.push('Your entire reply must be written in Simplified Chinese.');

  return lines.join('\n\n');
}

function formatBranchReference(branch?: PullRequest['base']): string | undefined {
  if (!branch) return undefined;
  const label = typeof branch.label === 'string' ? branch.label.trim() : '';
  const ref = typeof branch.ref === 'string' ? branch.ref.trim() : '';
  if (label && ref && label !== ref) {
    return `${label} (${ref})`;
  }
  return label || ref || undefined;
}

let cachedGitcodeCliEntry: string | null = null;

function resolveGitcodeCliEntry(): string {
  if (cachedGitcodeCliEntry) return cachedGitcodeCliEntry;

  let packageJsonPath: string;
  try {
    packageJsonPath = require.resolve('@gitany/cli/package.json');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to locate @gitany/cli package: ${message}`);
  }

  const cliDir = path.dirname(packageJsonPath);
  const pkg = require('@gitany/cli/package.json') as { bin?: Record<string, string> };
  const binRelative = pkg.bin?.gitcode ?? 'dist/index.js';
  const entry = path.resolve(cliDir, binRelative);
  cachedGitcodeCliEntry = entry;
  return entry;
}

interface RunGitcodeCliOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

async function runGitcodeCli(
  args: string[],
  options: RunGitcodeCliOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  const entry = resolveGitcodeCliEntry();
  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      env: { ...process.env, ...options.env },
      cwd: options.cwd,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const exitCode = code ?? undefined;
      const details = stderr.trim() || stdout.trim();
      const parts = [`gitcode CLI exited with code ${exitCode}`];
      if (details) parts.push(details);
      const error = new Error(parts.join(': '));
      Object.assign(error, { stdout, stderr, exitCode });
      reject(error);
    });
  });
}

async function removeTempDir(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore cleanup errors */
  }
}
