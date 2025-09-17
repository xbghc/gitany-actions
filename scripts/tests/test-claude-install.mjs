#!/usr/bin/env node

// Verifies Claude CLI can be installed inside a workspace Docker container.
// 环境变量:
// - TEST_NODE_VERSION: 可选，Docker 容器使用的 Node.js 版本，默认 20。
// - TEST_VERBOSE: 可选，设置为 "true" 时输出详细安装日志。
// - TEST_KEEP_CONTAINER: 可选，设置为 "true" 时在测试结束后保留容器。

import Docker from '../../packages/core/node_modules/dockerode/lib/docker.js';
import { createLogger } from '../../packages/shared/dist/index.js';
import { createWorkspaceContainer, installClaudeCli } from '../../packages/core/dist/index.js';

function envBoolean(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

async function main() {
  const nodeVersion = (process.env.TEST_NODE_VERSION || '20').trim();
  const verbose = envBoolean('TEST_VERBOSE', false);
  const keepContainer = envBoolean('TEST_KEEP_CONTAINER', false);

  const docker = new Docker();
  const log = createLogger('test:claude-install');

  const container = await createWorkspaceContainer({
    docker,
    image: `node:${nodeVersion}`,
    env: [],
    log,
  });

  try {
    console.log('⏳ 正在安装 Claude CLI...');
    console.log(`🟢 Node.js 版本: ${nodeVersion}`);
    if (verbose) {
      console.log('🔍 详细模式: 开启');
    }
    const result = await installClaudeCli({ container, log, verbose });
    if (verbose || !result.success) {
      console.log(result.output);
    }
    if (result.success) {
      console.log('✅ Claude CLI 安装成功');
    } else {
      console.error('❌ Claude CLI 安装失败');
      process.exit(1);
    }
  } finally {
    if (!keepContainer) {
      await container.remove({ force: true });
    } else {
      console.log(`🐳 保留容器 ID: ${container.id}`);
    }
  }
}

main().catch((err) => {
  console.error('💥 测试过程中发生错误:');
  console.error(err.message);
  process.exit(1);
});
