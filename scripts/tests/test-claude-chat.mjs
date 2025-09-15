#!/usr/bin/env node

import { chat } from '../../packages/core/dist/index.js';
import { config } from 'dotenv';

// 加载环境变量 (.env 文件可选)
config({ path: new URL('.env', import.meta.url) });

function usage() {
  console.log(`
用法: node test-claude-chat.mjs [选项]

选项:
  --repo-url <url>       仓库 URL (默认: ${process.env.TEST_REPO_URL})
  --question <text>      提问内容 (默认: ${process.env.TEST_QUESTION})
  --sha <hash>           目标 SHA 或分支 (默认: ${process.env.TEST_SHA || 'dev'})
  --node-version <v>     Node.js 版本 (默认: ${process.env.TEST_NODE_VERSION || '18'})
  --verbose, -v          显示详细输出
  --keep-container, -k   保留容器用于调试
  --help                 显示帮助信息
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { verbose: false, keepContainer: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--repo-url':
        opts.repoUrl = args[++i];
        break;
      case '--question':
        opts.question = args[++i];
        break;
      case '--sha':
        opts.sha = args[++i];
        break;
      case '--node-version':
        opts.nodeVersion = args[++i];
        break;
      case '--verbose':
      case '-v':
        opts.verbose = true;
        break;
      case '--keep-container':
      case '-k':
        opts.keepContainer = true;
        break;
      case '--help':
        usage();
        process.exit(0);
      default:
        console.error(`未知选项: ${arg}`);
        usage();
        process.exit(1);
    }
  }
  return opts;
}

async function main() {
  const args = parseArgs();
  const repoUrl = args.repoUrl || process.env.TEST_REPO_URL;
  const question = args.question || process.env.TEST_QUESTION;
  const sha = args.sha || process.env.TEST_SHA || 'dev';
  const nodeVersion = args.nodeVersion || process.env.TEST_NODE_VERSION || '18';
  const verbose = args.verbose;
  const keepContainer = args.keepContainer;

  if (!repoUrl || !question) {
    console.error('错误: 需要提供仓库 URL 和提问内容');
    usage();
    process.exit(1);
  }

  console.log('🔍 开始测试 chat 功能');
  console.log(`📦 仓库: ${repoUrl}`);
  console.log(`❓ 提问: ${question}`);
  console.log(`🔗 SHA/分支: ${sha}`);
  console.log(`🟢 Node.js 版本: ${nodeVersion}`);
  if (verbose) console.log('🔍 详细模式: 开启');
  if (keepContainer) console.log('🐳 保留容器: 开启');

  const result = await chat(repoUrl, question, {
    sha,
    nodeVersion,
    verbose,
    keepContainer,
  });

  if (result.success) {
    console.log('✅ Chat 成功, Claude 返回:');
    console.log(result.output);
  } else {
    console.error('❌ Chat 失败:');
    console.error(result.error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('💥 测试过程中发生错误:');
    console.error(err.message);
    process.exit(1);
  });
}

