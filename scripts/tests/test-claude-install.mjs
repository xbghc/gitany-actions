#!/usr/bin/env node

import Docker from '../../packages/core/node_modules/dockerode/lib/docker.js';
import { createLogger } from '../../packages/shared/dist/index.js';
import {
  createWorkspaceContainer,
  installClaudeCli,
} from '../../packages/core/dist/index.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    nodeVersion: '20',
    verbose: false,
    keepContainer: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--node-version':
        options.nodeVersion = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--keep-container':
      case '-k':
        options.keepContainer = true;
        break;
      case '--help':
        console.log(`
用法: node test-claude-install.mjs [选项]

选项:
  --node-version <v>     Node.js 版本 (默认: 20)
  --verbose, -v          显示详细输出
  --keep-container, -k   保留容器用于调试
  --help                 显示帮助信息
`);
        process.exit(0);
        break;
      default:
        console.error(`未知选项: ${arg}`);
        process.exit(1);
    }
  }
  return options;
}

async function main() {
  const { nodeVersion, verbose, keepContainer } = parseArgs();

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

