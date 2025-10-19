#!/usr/bin/env node

// Watch for AI mentions in a repository and trigger a chat response.
//
// 环境变量:
// - REPO_URL: 必填，目标仓库 URL。
// - MENTION_TOKEN: 可选，自定义触发标记，默认值为 Gitcode 当前用户的 @用户名。
// - ISSUE_INTERVAL_SEC: 可选，Issue 轮询间隔秒数。
// - PR_INTERVAL_SEC: 可选，PR 轮询间隔秒数。
// - WATCH_DURATION_SEC: 可选，监听持续秒数。
// - INCLUDE_ISSUE_COMMENTS: 可选，设置为 "false" 时不监听 Issue 评论。
// - INCLUDE_PR_COMMENTS: 可选，设置为 "false" 时不监听 PR 评论。
// - RUN_CHAT: 可选，设置为 "false" 时仅进行 dry-run。
// - CHAT_SHA: 可选，chat 使用的目标 SHA。
// - CHAT_NODE_VERSION: 可选，chat 容器使用的 Node.js 版本。
// - CHAT_KEEP_CONTAINER: 可选，设置为 "true" 时保留 chat 容器。
// - CHAT_VERBOSE: 可选，设置为 "true" 时输出 chat 详细日志。
// - VERBOSE: 可选，设置为 "true" 时打印评论正文等调试信息。
// - SHOW_PROMPT: 可选，设置为 "true" 时输出生成的提示词。

import { config } from 'dotenv';
import { chat, defaultPromptBuilder, runAiMentionsOnce } from '../packages/gitcode-actions/dist/index.js';
import { GitcodeClient } from '../packages/gitcode-api/dist/index.js';
import { createLogger } from '../packages/shared/dist/index.js';
const logger = createLogger('script:ai-mentions');

config({ path: new URL('.env', import.meta.url) });

async function resolveDefaultMention(client) {
  try {
    const profile = await client.user.getProfile();
    const login = profile.login?.trim();
    if (login) return `@${login}`;
  } catch (error) {
    logger.warn('⚠️ 无法从 Gitcode 获取当前用户名');
    logger.error(error);
  }
  return '@AI';
}

function envBoolean(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function envNumber(name) {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function formatTimestamp() {
  return new Date().toISOString();
}

function sourceLabel(source) {
  return source === 'pr_review_comment' ? 'PR 评论' : 'Issue 评论';
}

function promptPreview(prompt) {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  const shortened = normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
  return shortened.replace(/"/g, '\\"');
}

function logMention(context, mentionToken, options, prompt) {
  const header = `[${formatTimestamp()}] 🔔 检测到 ${sourceLabel(context.commentSource)} 中的 ${mentionToken}`;
  logger.info('\n' + header);
  logger.info(`   • Issue #${context.issueNumber}: ${context.issue.title}`);
  if (context.pullRequest) {
    logger.info(`   • PR #${context.pullRequest.number}: ${context.pullRequest.title}`);
  }
  logger.info(`   • 评论 ID: ${context.mentionComment.id}`);
  if (options.verbose) {
    const body = context.mentionComment.body?.trim();
    if (body) {
      logger.info('   • 评论正文:');
      logger.info(
        body
          .split('\n')
          .map((line) => `     ${line}`)
          .join('\n'),
      );
    }
  }
  if (options.showPrompt) {
    logger.info('----- Prompt 开始 -----');
    logger.info(prompt);
    logger.info('----- Prompt 结束 -----');
  }
}

function createDryRunExecutor() {
  return async () => {
    logger.info('   - (dry-run) 跳过执行 "claude -p ..."');
    logger.info('🤖 (dry-run) 已捕获到提及, 未实际调用 chat。');
    return { success: true, output: 'Dry-run: chat 未执行。' };
  };
}

function createLoggedChatExecutor() {
  return async (repoUrl, prompt, options) => {
    const reused = Boolean(options?.container);
    if (reused) {
      const id = options.container?.id ? options.container.id.slice(0, 12) : '未知';
      logger.info(`   - chat 容器: 复用 (ID: ${id})`);
    } else {
      logger.info('   - chat 容器: 新建');
    }
    logger.info(`   - 执行命令 "claude -p ${promptPreview(prompt)}"`);
    return chat(repoUrl, prompt, options);
  };
}

function logChatResult(result, context, runChat) {
  if (result.success) {
    if (runChat) {
      const length = result.output ? result.output.length : 0;
      logger.info(`   - [后台] 获取到返回结果 (${length} 字符)`);
    } else {
      logger.info('   - [后台] (dry-run) 获取到模拟结果');
    }
    if (runChat) {
      logger.info(`✅ [后台] chat 成功 (评论 ID ${context.mentionComment.id})`);
      if (result.output) {
        logger.info('----- chat 输出 -----');
        logger.info(result.output);
        logger.info('----------------------');
      }
    } else {
      logger.info(`✅ [后台] 已模拟 chat (评论 ID ${context.mentionComment.id})`);
    }
  } else {
    logger.error('   - [后台] 获取返回结果失败');
    logger.error(`❌ [后台] chat 失败 (评论 ID ${context.mentionComment.id})`);
    if (result.error) {
      logger.error(result.error);
    }
  }
}

function logReplySuccess(reply, context) {
  const source = sourceLabel(reply.source);
  // The new watcher logic handles logging for placeholder creation and editing internally.
  // This callback is now only for the final success case.
  logger.info(`   - [后台] 成功更新占位评论 (${source}, 评论 ID ${context.mentionComment.id})`);
  logger.info(`💬 [后台] 已通过编辑评论进行回复 (评论 ID ${context.mentionComment.id})`);
}

function logReplyError(error, context) {
  logger.error('   - 自动回复失败，详情如下');
  logger.error(`⚠️ 自动回复失败 (评论 ID ${context.mentionComment.id})`);
  if (error) {
    logger.error(error);
  }
}

function buildChatOptions(runChat, chatKeepContainer, chatVerbose) {
  if (!runChat) return undefined;
  const options = {};
  const sha = (process.env.CHAT_SHA || '').trim();
  if (sha) options.sha = sha;
  const nodeVersion = (process.env.CHAT_NODE_VERSION || '').trim();
  if (nodeVersion) options.nodeVersion = nodeVersion;
  if (chatKeepContainer) options.keepContainer = true;
  if (chatVerbose) options.verbose = true;
  return options;
}

async function main() {
  const repoUrl = (process.env.REPO_URL || '').trim();
  if (!repoUrl) {
    logger.error('错误: 请设置 REPO_URL 环境变量。');
    process.exit(1);
  }

  const includeIssueComments = envBoolean('INCLUDE_ISSUE_COMMENTS', true);
  const includePullRequestComments = envBoolean('INCLUDE_PR_COMMENTS', true);
  if (!includeIssueComments && !includePullRequestComments) {
    logger.error('错误: 至少需要监听 Issue 或 PR 评论中的一种');
    process.exit(1);
  }

  const runChat = envBoolean('RUN_CHAT', true);
  const verbose = envBoolean('VERBOSE', false);
  const showPrompt = envBoolean('SHOW_PROMPT', false);
  const chatKeepContainer = envBoolean('CHAT_KEEP_CONTAINER', false);
  const chatVerbose = envBoolean('CHAT_VERBOSE', false);
  const issueIntervalSec = envNumber('ISSUE_INTERVAL_SEC');
  const prIntervalSec = envNumber('PR_INTERVAL_SEC');

  const client = new GitcodeClient();
  const mentionToken =
    (process.env.MENTION_TOKEN || '').trim() || (await resolveDefaultMention(client, verbose));
  const chatOptions = buildChatOptions(runChat, chatKeepContainer, chatVerbose);

  logger.info('👂 开始扫描 AI 评论提及 (一次性)');
  logger.info(`📦 仓库: ${repoUrl}`);
  logger.info(`🏷️ 触发标记: ${mentionToken}`);
  logger.info(`📝 扫描 Issue 评论: ${includeIssueComments ? '是' : '否'}`);
  logger.info(`📝 扫描 PR 评论: ${includePullRequestComments ? '是' : '否'}`);
  logger.info(`🤖 chat 模式: ${runChat ? '实际调用' : '模拟 (dry-run)'}`);
  if (chatOptions?.sha) logger.info(`🔗 chat 目标: ${chatOptions.sha}`);
  if (chatOptions?.nodeVersion) logger.info(`🟢 chat Node.js 版本: ${chatOptions.nodeVersion}`);
  if (chatKeepContainer) logger.info('🐳 chat 执行后将保留容器');
  if (chatVerbose) logger.info('🔍 chat 详细日志: 开启');
  if (showPrompt) logger.info('📝 将输出生成的提示词');
  if (verbose) logger.info('🔍 将打印评论正文等调试信息');

  const loggingOptions = { verbose, showPrompt };

  await runAiMentionsOnce(client, repoUrl, {
    mention: mentionToken,
    issueIntervalSec,
    prIntervalSec,
    issueQuery: {
      state: 'open',
      page: 1,
      per_page: 20,
    },
    includeIssueComments,
    includePullRequestComments,
    chatOptions,
    chatExecutor: runChat ? createLoggedChatExecutor() : createDryRunExecutor(),
    replyWithComment: runChat,
    buildPrompt: (context) => {
      const prompt = defaultPromptBuilder(context);
      logMention(context, mentionToken, loggingOptions, prompt);
      return prompt;
    },
    onChatResult: (result, context) => {
      logChatResult(result, context, runChat);
    },
    onReplyCreated: (reply, context) => {
      logReplySuccess(reply, context);
    },
    onReplyError: (error, context) => {
      logReplyError(error, context);
    },
  });

  logger.info('✅ 扫描完成。');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    logger.error('💥 扫描过程中发生错误:');
    logger.error(err);
    process.exit(1);
  });
}
