#!/usr/bin/env node

// 环境变量:
// - TEST_REPO_URL: 必填，目标仓库 URL。
// - TEST_MENTION: 可选，自定义触发标记，默认值为 @AI。
// - TEST_ISSUE_INTERVAL: 可选，Issue 轮询间隔秒数。
// - TEST_PR_INTERVAL: 可选，PR 轮询间隔秒数。
// - TEST_WATCH_DURATION: 可选，监听持续秒数。
// - TEST_INCLUDE_ISSUE_COMMENTS: 可选，设置为 "false" 时不监听 Issue 评论。
// - TEST_INCLUDE_PR_COMMENTS: 可选，设置为 "false" 时不监听 PR 评论。
// - TEST_RUN_CHAT: 可选，设置为 "false" 时仅进行 dry-run。
// - TEST_SHA: 可选，chat 使用的目标 SHA。
// - TEST_NODE_VERSION: 可选，chat 容器使用的 Node.js 版本。
// - TEST_CHAT_KEEP_CONTAINER: 可选，设置为 "true" 时保留 chat 容器。
// - TEST_CHAT_VERBOSE: 可选，设置为 "true" 时输出 chat 详细日志。
// - TEST_VERBOSE: 可选，设置为 "true" 时打印评论正文等调试信息。
// - TEST_SHOW_PROMPT: 可选，设置为 "true" 时输出生成的提示词。

import { config } from 'dotenv';
import { watchAiMentions, defaultPromptBuilder, chat } from '../../packages/core/dist/index.js';
import { GitcodeClient } from '../../packages/gitcode/dist/index.js';

config({ path: new URL('.env', import.meta.url) });

const DEFAULT_MENTION = '@AI';

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
  console.log('\n' + header);
  console.log(`   • Issue #${context.issueNumber}: ${context.issue.title}`);
  if (context.pullRequest) {
    console.log(`   • PR #${context.pullRequest.number}: ${context.pullRequest.title}`);
  }
  console.log(`   • 评论 ID: ${context.mentionComment.id}`);
  if (options.verbose) {
    const body = context.mentionComment.body?.trim();
    if (body) {
      console.log('   • 评论正文:');
      console.log(body.split('\n').map((line) => `     ${line}`).join('\n'));
    }
  }
  if (options.showPrompt) {
    console.log('----- Prompt 开始 -----');
    console.log(prompt);
    console.log('----- Prompt 结束 -----');
  }
}

function createDryRunExecutor() {
  return async () => {
    console.log('   - (dry-run) 跳过执行 "claude -p ..."');
    console.log('🤖 (dry-run) 已捕获到提及, 未实际调用 chat。');
    return { success: true, output: 'Dry-run: chat 未执行。' };
  };
}

function createLoggedChatExecutor() {
  return async (repoUrl, prompt, options) => {
    const reused = Boolean(options?.container);
    if (reused) {
      const id = options.container?.id ? options.container.id.slice(0, 12) : '未知';
      console.log(`   - chat 容器: 复用 (ID: ${id})`);
    } else {
      console.log('   - chat 容器: 新建');
    }
    console.log(`   - 执行命令 "claude -p ${promptPreview(prompt)}"`);
    return chat(repoUrl, prompt, options);
  };
}

function logChatResult(result, context, runChat) {
  if (result.success) {
    if (runChat) {
      const length = result.output ? result.output.length : 0;
      console.log(`   - 获取到返回结果 (${length} 字符)`);
    } else {
      console.log('   - (dry-run) 获取到模拟结果');
    }
    if (runChat) {
      console.log(`✅ chat 成功 (评论 ID ${context.mentionComment.id})`);
      if (result.output) {
        console.log('----- chat 输出 -----');
        console.log(result.output);
        console.log('----------------------');
      }
    } else {
      console.log(`✅ 已模拟 chat (评论 ID ${context.mentionComment.id})`);
    }
  } else {
    console.error('   - 获取返回结果失败');
    console.error(`❌ chat 失败 (评论 ID ${context.mentionComment.id})`);
    if (result.error) {
      console.error(result.error);
    }
  }
}

function logReplySuccess(reply, context) {
  const source = sourceLabel(reply.source);
  console.log(
    `   - 发送自动回复 (${source}, 原评论 ID ${context.mentionComment.id}, 新评论 ID ${reply.comment.id})`,
  );
  console.log(`💬 已自动回复 ${source} (原评论 ID ${context.mentionComment.id})`);
  console.log(`   • 新评论 ID: ${reply.comment.id}`);
}

function logReplyError(error, context) {
  console.error('   - 自动回复失败，详情如下');
  console.error(`⚠️ 自动回复失败 (评论 ID ${context.mentionComment.id})`);
  if (error) {
    console.error(error);
  }
}

function buildChatOptions(runChat, chatKeepContainer, chatVerbose) {
  if (!runChat) return undefined;
  const options = {};
  const sha = (process.env.TEST_SHA || '').trim();
  if (sha) options.sha = sha;
  const nodeVersion = (process.env.TEST_NODE_VERSION || '').trim();
  if (nodeVersion) options.nodeVersion = nodeVersion;
  if (chatKeepContainer) options.keepContainer = true;
  if (chatVerbose) options.verbose = true;
  return options;
}

async function main() {
  const repoUrl = (process.env.TEST_REPO_URL || '').trim();
  if (!repoUrl) {
    console.error('错误: 请设置 TEST_REPO_URL 环境变量。');
    process.exit(1);
  }

  const includeIssueComments = envBoolean('TEST_INCLUDE_ISSUE_COMMENTS', true);
  const includePullRequestComments = envBoolean('TEST_INCLUDE_PR_COMMENTS', true);
  if (!includeIssueComments && !includePullRequestComments) {
    console.error('错误: 至少需要监听 Issue 或 PR 评论中的一种');
    process.exit(1);
  }

  const mentionToken = (process.env.TEST_MENTION || DEFAULT_MENTION).trim();
  const issueIntervalSec = envNumber('TEST_ISSUE_INTERVAL');
  const prIntervalSec = envNumber('TEST_PR_INTERVAL');
  const durationSec = envNumber('TEST_WATCH_DURATION');
  const runChat = envBoolean('TEST_RUN_CHAT', true);
  const verbose = envBoolean('TEST_VERBOSE', false);
  const showPrompt = envBoolean('TEST_SHOW_PROMPT', false);
  const chatKeepContainer = envBoolean('TEST_CHAT_KEEP_CONTAINER', false);
  const chatVerbose = envBoolean('TEST_CHAT_VERBOSE', false);

  const chatOptions = buildChatOptions(runChat, chatKeepContainer, chatVerbose);

  console.log('👂 开始监听 AI 评论提及');
  console.log(`📦 仓库: ${repoUrl}`);
  console.log(`🏷️ 触发标记: ${mentionToken}`);
  console.log(`📝 监听 Issue 评论: ${includeIssueComments ? '是' : '否'}`);
  console.log(`📝 监听 PR 评论: ${includePullRequestComments ? '是' : '否'}`);
  console.log(`🤖 chat 模式: ${runChat ? '实际调用' : '模拟 (dry-run)'}`);
  if (chatOptions?.sha) console.log(`🔗 chat 目标: ${chatOptions.sha}`);
  if (chatOptions?.nodeVersion) console.log(`🟢 chat Node.js 版本: ${chatOptions.nodeVersion}`);
  if (chatKeepContainer) console.log('🐳 chat 执行后将保留容器');
  if (chatVerbose) console.log('🔍 chat 详细日志: 开启');
  if (issueIntervalSec) console.log(`⏱️ Issue 轮询间隔: ${issueIntervalSec}s`);
  if (prIntervalSec) console.log(`⏱️ PR 轮询间隔: ${prIntervalSec}s`);
  if (durationSec) console.log(`⌛ 自动停止: ${durationSec}s`);
  if (showPrompt) console.log('📝 将输出生成的提示词');
  if (verbose) console.log('🔍 将打印评论正文等调试信息');

  const client = new GitcodeClient();
  const timers = [];
  const loggingOptions = { verbose, showPrompt };

  const watcher = watchAiMentions(client, repoUrl, {
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

  function stopWatcher(exitCode = 0) {
    watcher.stop();
    for (const timer of timers) {
      clearTimeout(timer);
    }
    process.exit(exitCode);
  }

  process.on('SIGINT', () => {
    console.log('\n🛑 收到 SIGINT, 正在退出...');
    stopWatcher(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 收到 SIGTERM, 正在退出...');
    stopWatcher(0);
  });

  if (durationSec) {
    timers.push(setTimeout(() => {
      console.log('⏰ 达到设定监听时长, 自动停止');
      stopWatcher(0);
    }, durationSec * 1000));
  }

  console.log('✅ 监听已启动，按 Ctrl+C 可随时退出。');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('💥 监听过程中发生错误:');
    console.error(err);
    process.exit(1);
  });
}
