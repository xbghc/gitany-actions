#!/usr/bin/env node

import { testShaBuild } from '../../packages/core/dist/index.js';
import { config } from 'dotenv';

// 加载环境变量
config({ path: new URL('.env', import.meta.url) });

function usage() {
  console.log(`
用法: node test-pnpm-build.mjs [选项]

选项:
  --repo-url <url>       仓库 URL (默认: ${process.env.TEST_REPO_URL})
  --sha <hash>           提交 SHA 哈希 (默认: ${process.env.TEST_SHA})
  --node-version <v>     Node.js 版本 (默认: ${process.env.TEST_NODE_VERSION || 18})
  --verbose, -v          显示详细输出
  --keep-container, -k   保留容器用于调试
  --help                 显示帮助信息

示例:
  node test-pnpm-build.mjs
  node test-pnpm-build.mjs --repo-url https://gitcode.com/user/repo --sha abc123
  node test-pnpm-build.mjs --node-version 20 --verbose
  node test-pnpm-build.mjs --keep-container
`);
}

function showTroubleshootingGuide(result) {
  console.log('');
  console.log('🔧 故障排除指南:');
  console.log('');

  if (!result.diagnostics.dockerAvailable) {
    console.log('❌ Docker 问题:');
    console.log('   - 请确保 Docker 正在运行');
    console.log('   - 检查 Docker 服务状态: systemctl status docker');
    console.log('   - 尝试重启 Docker: sudo systemctl restart docker');
    console.log('');
  }

  if (!result.diagnostics.repoAccessible) {
    console.log('❌ 仓库访问问题:');
    console.log('   - 检查仓库 URL 是否正确');
    console.log('   - 确认仓库是公开的或你有访问权限');
    console.log('   - 测试克隆: git clone ' + process.env.TEST_REPO_URL);
    console.log('');
  }

  if (!result.diagnostics.isPnpmProject) {
    console.log('❌ 非 pnpm 项目:');
    console.log('   - 项目未使用 pnpm 作为包管理器');
    console.log('   - 检查 package.json 中的 packageManager 字段');
    console.log('   - 检查是否存在 pnpm-lock.yaml 文件');
    console.log('   - 如果项目使用 npm/yarn，请使用对应的包管理器测试');
    console.log('');
  }

  if (!result.diagnostics.packageJsonExists) {
    console.log('❌ 缺少 package.json:');
    console.log('   - 确认仓库根目录包含 package.json 文件');
    console.log('   - 检查 SHA 提交是否包含必要的文件');
    console.log('');
  }

  if (result.diagnostics.isPnpmProject && !result.diagnostics.pnpmLockExists) {
    console.log('⚠️  pnpm 项目缺少 pnpm-lock.yaml:');
    console.log('   - 运行 pnpm install 生成锁文件');
    console.log('   - 或检查 .gitignore 是否错误地忽略了锁文件');
    console.log('');
  }

  if (result.diagnostics.steps.clone.error) {
    console.log('❌ 克隆失败:');
    console.log('   ' + result.diagnostics.steps.clone.error);
    console.log('');
  }

  if (result.diagnostics.steps.verifySha.error) {
    console.log('❌ SHA/分支验证失败:');
    console.log('   ' + result.diagnostics.steps.verifySha.error);
    console.log('   - 请检查提供的 SHA 提交哈希是否正确');
    console.log('   - 确认该提交存在于仓库中');
    console.log('   - 如果使用分支名，请确保分支名正确');
    console.log('');
  }

  if (result.diagnostics.steps.checkout.error) {
    console.log('❌ 切换分支失败:');
    console.log('   ' + result.diagnostics.steps.checkout.error);
    console.log('');
  }

  if (result.diagnostics.steps.checkProject.error) {
    console.log('❌ 项目检查失败:');
    console.log('   ' + result.diagnostics.steps.checkProject.error);
    console.log('');
  }

  if (result.diagnostics.steps.install.error) {
    console.log('❌ pnpm 安装失败:');
    console.log('   ' + result.diagnostics.steps.install.error);
    console.log('   - 常见原因: 网络问题、依赖冲突、私有包权限');
    console.log('');
  }

  if (result.error && !result.diagnostics.steps.clone.error && !result.diagnostics.steps.install.error) {
    console.log('❌ 其他错误:');
    console.log('   ' + result.error);
    console.log('');
  }

  console.log('💡 调试建议:');
  console.log('   1. 使用 --verbose 参数查看详细输出');
  console.log('   2. 使用 --keep-container 保留容器进行手动调试');
  console.log('   3. 检查网络连接和代理设置');
  console.log('   4. 验证 Node.js 版本兼容性');
  console.log('   5. 确认项目确实是 pnpm 项目');
  console.log('   6. 检查 package.json 中的依赖是否正确');
  console.log('   7. 验证 SHA 提交哈希是否正确存在');
  console.log('   8. 使用 git log 查看可用的提交');
  console.log('');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
        usage();
        process.exit(0);

      case '--repo-url':
        options.repoUrl = args[++i];
        break;

      case '--sha':
        options.sha = args[++i];
        break;

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

      default:
        console.error(`未知选项: ${arg}`);
        usage();
        process.exit(1);
    }
  }

  return options;
}

async function main() {
  try {
    // 解析命令行参数
    const cliArgs = parseArgs();

    // 配置测试参数
    const repoUrl = cliArgs.repoUrl || process.env.TEST_REPO_URL;
    const sha = cliArgs.sha || process.env.TEST_SHA;
    const nodeVersion = cliArgs.nodeVersion || process.env.TEST_NODE_VERSION || '18';
    const verbose = cliArgs.verbose || false;
    const keepContainer = cliArgs.keepContainer || false;

    // 验证必要参数
    if (!repoUrl || !sha) {
      console.error('错误: 请提供仓库 URL 和 SHA 提交哈希');
      console.log('可以通过命令行参数或环境变量 TEST_REPO_URL 和 TEST_SHA 设置');
      usage();
      process.exit(1);
    }

    console.log('🔍 开始测试 pnpm 构建功能');
    console.log(`📦 仓库: ${repoUrl}`);
    console.log(`🔗 SHA: ${sha}`);
    console.log(`🟢 Node.js 版本: ${nodeVersion}`);
    if (verbose) console.log(`🔍 详细模式: 开启`);
    if (keepContainer) console.log(`🐳 保留容器: 开启`);
    console.log('');

    // 执行测试
    console.log('⏳ 正在创建 Docker 容器并测试构建...');
    const startTime = Date.now();

    const result = await testShaBuild(repoUrl, sha, {
      nodeVersion,
      verbose,
      keepContainer
    });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log(`⏱️  测试完成，总耗时: ${totalDuration} 秒`);

    // 显示详细的诊断信息
    console.log('');
    console.log('📊 详细诊断信息:');
    console.log(`   Docker 可用: ${result.diagnostics.dockerAvailable ? '✅' : '❌'}`);
    console.log(`   仓库可访问: ${result.diagnostics.repoAccessible ? '✅' : '❌'}`);
    console.log(`   项目类型: ${result.diagnostics.isPnpmProject ? '🟦 pnpm 项目' : '❌ 非 pnpm 项目'}`);
    console.log(`   package.json: ${result.diagnostics.packageJsonExists ? '✅' : '❌'}`);
    console.log(`   pnpm-lock.yaml: ${result.diagnostics.pnpmLockExists ? '✅' : '❌'}`);
    console.log(`   容器 ID: ${result.diagnostics.containerId || 'N/A'}`);
    console.log('');

    console.log('📋 各步骤耗时:');
    console.log(`   克隆仓库: ${result.diagnostics.steps.clone.duration}ms`);
    console.log(`   验证SHA: ${result.diagnostics.steps.verifySha.duration}ms`);
    console.log(`   切换分支: ${result.diagnostics.steps.checkout.duration}ms`);
    console.log(`   项目检查: ${result.diagnostics.steps.checkProject.duration}ms`);
    console.log(`   安装依赖: ${result.diagnostics.steps.install.duration}ms`);
    console.log('');

    if (result.success) {
      console.log('✅ pnpm 构建测试成功!');
      console.log('   - 仓库可以成功克隆');
      console.log('   - SHA/分支验证通过');
      console.log('   - 可以切换到指定 SHA');
      console.log('   - 确认为有效的 pnpm 项目');
      console.log('   - pnpm install 执行成功');

      if (keepContainer && result.diagnostics.containerId) {
        console.log('');
        console.log(`🐳 容器已保留，ID: ${result.diagnostics.containerId}`);
        console.log('   使用以下命令进入容器调试:');
        console.log(`   docker exec -it ${result.diagnostics.containerId} sh`);
      }
    } else {
      console.log('❌ 构建测试失败!');
      console.log(`   退出码: ${result.exitCode}`);
      console.log(`   错误: ${result.error || '未知错误'}`);

      // 显示故障排除指南
      showTroubleshootingGuide(result);

      if (keepContainer && result.diagnostics.containerId) {
        console.log(`🐳 容器已保留用于调试，ID: ${result.diagnostics.containerId}`);
        console.log('   使用以下命令进入容器调试:');
        console.log(`   docker exec -it ${result.diagnostics.containerId} sh`);
        console.log('   清理容器: docker rm -f ' + result.diagnostics.containerId);
      }
    }

    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('');
    console.error('💥 测试过程中发生错误:');
    console.error(`   ${error.message}`);

    if (error.message.includes('Docker daemon is not available')) {
      console.error('');
      console.error('💡 提示: 请确保 Docker 正在运行');
    }

    process.exit(1);
  }
}

// 检查是否直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}