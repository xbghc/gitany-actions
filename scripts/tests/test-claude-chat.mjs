#!/usr/bin/env node

// 环境变量:
// - TEST_REPO_URL: 必填，目标仓库 URL。
// - TEST_QUESTION: 必填，要提交给 chat 的问题或提示词。
// - TEST_SHA: 可选，chat 检查的目标提交或分支，默认 dev。
// - TEST_NODE_VERSION: 可选，chat 容器使用的 Node.js 版本，默认 18。
// - TEST_VERBOSE: 可选，设置为 "true" 时输出详细日志。
// - TEST_KEEP_CONTAINER: 可选，设置为 "true" 时保留执行容器。

import { chat } from '../../packages/core/dist/index.js';
import { config } from 'dotenv';

// 加载环境变量 (.env 文件可选)
config({ path: new URL('.env', import.meta.url) });

function envBoolean(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

async function main() {
  const repoUrl = (process.env.TEST_REPO_URL || '').trim();
  const question = (process.env.TEST_QUESTION || '').trim();
  const sha = (process.env.TEST_SHA || 'dev').trim();
  const nodeVersion = (process.env.TEST_NODE_VERSION || '18').trim();
  const verbose = envBoolean('TEST_VERBOSE', false);
  const keepContainer = envBoolean('TEST_KEEP_CONTAINER', false);

  if (!repoUrl || !question) {
    console.error('错误: 请设置 TEST_REPO_URL 和 TEST_QUESTION 环境变量。');
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

