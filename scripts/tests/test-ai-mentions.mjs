#!/usr/bin/env node

import { config } from 'dotenv';
import { watchAiMentions, defaultPromptBuilder } from '../../packages/core/dist/index.js';
import { GitcodeClient } from '../../packages/gitcode/dist/index.js';

config({ path: new URL('.env', import.meta.url) });

const DEFAULT_MENTION = '@AI';

function usage() {
  console.log(`
用法: node test-ai-mentions.mjs [选项]

选项:
  --repo-url <url>          仓库 URL (默认: ${process.env.TEST_REPO_URL || '无'})
  --mention <text>          触发标记 (默认: ${process.env.TEST_MENTION || DEFAULT_MENTION})
  --issue-interval <sec>    Issue 轮询间隔秒数 (默认: ${process.env.TEST_ISSUE_INTERVAL || '5'})
  --pr-interval <sec>       PR 轮询间隔秒数 (默认: ${process.env.TEST_PR_INTERVAL || '5'})
  --issue-only              仅监听 Issue 评论
  --pr-only                 仅监听 PR 评论
  --duration <sec>          自动停止监听的秒数
  --run-chat                实际调用 chat (默认模拟)
  --chat-sha <sha>          chat 目标 SHA (默认: ${process.env.TEST_SHA || 'dev'})
  --chat-node-version <v>   chat 容器 Node.js 版本 (默认: ${process.env.TEST_NODE_VERSION || '18'})
  --chat-keep-container     chat 执行后保留容器
  --chat-verbose            chat 执行输出详细日志
  --show-prompt             打印拼装后的提示语
  --verbose                 打印评论正文等更多信息
  --help                    显示帮助信息
`);
}

function expectValue(args, index, flag) {
  if (index >= args.length) {
    console.error(`错误: ${flag} 需要一个值`);
    usage();
    process.exit(1);
  }
  return args[index];
}

function parsePositiveNumber(raw, flag) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`错误: ${flag} 需要正数, 收到 ${raw}`);
    process.exit(1);
  }
  return value;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const opts = {
    includeIssueComments: true,
    includePullRequestComments: true,
    runChat: true,
    verbose: false,
    showPrompt: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
        usage();
        process.exit(0);
      case '--repo-url':
        opts.repoUrl = expectValue(argv, ++i, '--repo-url');
        break;
      case '--mention':
        opts.mention = expectValue(argv, ++i, '--mention');
        break;
      case '--issue-interval':
        opts.issueIntervalSec = parsePositiveNumber(expectValue(argv, ++i, '--issue-interval'), '--issue-interval');
        break;
      case '--pr-interval':
        opts.prIntervalSec = parsePositiveNumber(expectValue(argv, ++i, '--pr-interval'), '--pr-interval');
        break;
      case '--issue-only':
        opts.includePullRequestComments = false;
        break;
      case '--pr-only':
        opts.includeIssueComments = false;
        break;
      case '--duration':
        opts.durationSec = parsePositiveNumber(expectValue(argv, ++i, '--duration'), '--duration');
        break;
      case '--run-chat':
        opts.runChat = true;
        break;
      case '--chat-sha':
        opts.chatSha = expectValue(argv, ++i, '--chat-sha');
        break;
      case '--chat-node-version':
        opts.chatNodeVersion = expectValue(argv, ++i, '--chat-node-version');
        break;
      case '--chat-keep-container':
        opts.chatKeepContainer = true;
        break;
      case '--chat-verbose':
        opts.chatVerbose = true;
        break;
      case '--show-prompt':
        opts.showPrompt = true;
        break;
      case '--verbose':
        opts.verbose = true;
        break;
      default:
        console.error(`未知选项: ${arg}`);
        usage();
        process.exit(1);
    }
  }

  return opts;
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
    console.log('🤖 (dry-run) 已捕获到提及, 未实际调用 chat。');
    return { success: true, output: 'Dry-run: chat 未执行。' };
  };
}

function logChatResult(result, context, runChat) {
  if (result.success) {
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
    console.error(`❌ chat 失败 (评论 ID ${context.mentionComment.id})`);
    if (result.error) {
      console.error(result.error);
    }
  }
}

function logReplySuccess(reply, context) {
  const source = sourceLabel(reply.source);
  console.log(`💬 已自动回复 ${source} (原评论 ID ${context.mentionComment.id})`);
  console.log(`   • 新评论 ID: ${reply.comment.id}`);
}

function logReplyError(error, context) {
  console.error(`⚠️ 自动回复失败 (评论 ID ${context.mentionComment.id})`);
  if (error) {
    console.error(error);
  }
}

function buildChatOptions(args) {
  if (!args.runChat) return undefined;
  const options = {};
  const sha = args.chatSha || process.env.TEST_SHA;
  if (sha) options.sha = sha;
  const nodeVersion = args.chatNodeVersion || process.env.TEST_NODE_VERSION;
  if (nodeVersion) options.nodeVersion = nodeVersion;
  if (args.chatKeepContainer) options.keepContainer = true;
  if (args.chatVerbose) options.verbose = true;
  return options;
}

async function main() {
  const args = parseArgs();
  const repoUrl = args.repoUrl || process.env.TEST_REPO_URL;
  if (!repoUrl) {
    console.error('错误: 需要提供仓库 URL (--repo-url 或环境变量 TEST_REPO_URL)');
    usage();
    process.exit(1);
  }

  if (!args.includeIssueComments && !args.includePullRequestComments) {
    console.error('错误: 至少需要监听 Issue 或 PR 评论中的一种');
    process.exit(1);
  }

  const mentionToken = (args.mention || process.env.TEST_MENTION || DEFAULT_MENTION).trim();
  const issueIntervalSec = args.issueIntervalSec || envNumber('TEST_ISSUE_INTERVAL');
  const prIntervalSec = args.prIntervalSec || envNumber('TEST_PR_INTERVAL');
  const durationSec = args.durationSec || envNumber('TEST_WATCH_DURATION');

  const chatOptions = buildChatOptions(args);

  console.log('👂 开始监听 AI 评论提及');
  console.log(`📦 仓库: ${repoUrl}`);
  console.log(`🏷️ 触发标记: ${mentionToken}`);
  console.log(`📝 监听 Issue 评论: ${args.includeIssueComments ? '是' : '否'}`);
  console.log(`📝 监听 PR 评论: ${args.includePullRequestComments ? '是' : '否'}`);
  console.log(`🤖 chat 模式: ${args.runChat ? '实际调用' : '模拟 (dry-run)'}`);
  if (issueIntervalSec) console.log(`⏱️ Issue 轮询间隔: ${issueIntervalSec}s`);
  if (prIntervalSec) console.log(`⏱️ PR 轮询间隔: ${prIntervalSec}s`);
  if (durationSec) console.log(`⌛ 自动停止: ${durationSec}s`);

  const client = new GitcodeClient();
  const timers = [];

  const watcher = watchAiMentions(client, repoUrl, {
    mention: mentionToken,
    issueIntervalSec,
    prIntervalSec,
    includeIssueComments: args.includeIssueComments,
    includePullRequestComments: args.includePullRequestComments,
    chatOptions,
    chatExecutor: args.runChat ? undefined : createDryRunExecutor(),
    replyWithComment: args.runChat,
    buildPrompt: (context) => {
      const prompt = defaultPromptBuilder(context);
      logMention(context, mentionToken, args, prompt);
      return prompt;
    },
    onChatResult: (result, context) => {
      logChatResult(result, context, args.runChat);
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
