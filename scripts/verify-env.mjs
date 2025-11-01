#!/usr/bin/env node

// 统一的环境验证脚本：检查 Docker、Git 和 GitCode 认证
// 用法: node scripts/verify-env.mjs
// 环境变量:
// - SKIP_DOCKER: 设置为 "true" 时跳过 Docker 检查
// - SKIP_GIT: 设置为 "true" 时跳过 Git 检查
// - SKIP_GITCODE: 设置为 "true" 时跳过 GitCode 检查

import { execSync } from 'node:child_process';
import { GitcodeClient } from '../packages/gitcode-api/dist/index.js';

function envBoolean(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function execCommand(cmd, silent = false) {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return { success: true, output: output?.trim() };
  } catch (err) {
    return {
      success: false,
      error: err.stderr?.toString().trim() || err.message,
      exitCode: err.status,
    };
  }
}

async function checkDocker() {
  console.log('\n🐳 检查 Docker 环境...');

  // 检查 Docker 是否安装
  const versionCheck = execCommand('docker --version', true);
  if (!versionCheck.success) {
    console.error('  ❌ Docker 未安装或不在 PATH 中');
    return false;
  }
  console.log(`  ✅ Docker 已安装: ${versionCheck.output}`);

  // 检查 Docker daemon 是否运行
  const psCheck = execCommand('docker ps', true);
  if (!psCheck.success) {
    console.error('  ❌ Docker daemon 未运行');
    console.error(`     错误: ${psCheck.error}`);
    return false;
  }
  console.log('  ✅ Docker daemon 正在运行');

  // 测试运行容器
  console.log('  ⏳ 测试运行容器...');
  const containerTest = execCommand('docker run --rm hello-world', true);
  if (!containerTest.success) {
    console.error('  ❌ Docker 容器无法运行');
    console.error(`     错误: ${containerTest.error}`);
    return false;
  }
  console.log('  ✅ Docker 容器可以正常运行');

  return true;
}

async function checkGit() {
  console.log('\n📦 检查 Git 环境...');

  // 检查 Git 是否安装
  const versionCheck = execCommand('git --version', true);
  if (!versionCheck.success) {
    console.error('  ❌ Git 未安装或不在 PATH 中');
    return false;
  }
  console.log(`  ✅ Git 已安装: ${versionCheck.output}`);

  // 检查 Git 配置
  const nameCheck = execCommand('git config --global user.name', true);
  const emailCheck = execCommand('git config --global user.email', true);

  if (nameCheck.success && nameCheck.output) {
    console.log(`  ✅ Git 用户名: ${nameCheck.output}`);
  } else {
    console.warn('  ⚠️  未配置 Git 用户名 (git config --global user.name)');
  }

  if (emailCheck.success && emailCheck.output) {
    console.log(`  ✅ Git 邮箱: ${emailCheck.output}`);
  } else {
    console.warn('  ⚠️  未配置 Git 邮箱 (git config --global user.email)');
  }

  // 测试基本 Git 命令
  const statusCheck = execCommand('git status', true);
  if (statusCheck.success) {
    console.log('  ✅ Git 命令可以正常使用');
  } else {
    console.log('  ℹ️  当前目录不是 Git 仓库（这是正常的）');
  }

  return true;
}

async function checkGitCode() {
  console.log('\n🔑 检查 GitCode 认证...');

  try {
    const client = new GitcodeClient();

    // 检查 token 配置
    const token = await client.auth.token();
    if (!token) {
      console.error('  ❌ GitCode token 未配置');
      console.error('     请运行: gitcode auth login');
      console.error('     或设置环境变量: GITCODE_TOKEN');
      return false;
    }
    console.log('  ✅ GitCode token 已配置');

    // 测试 API 连接
    console.log('  ⏳ 测试 GitCode API 连接...');
    try {
      const profile = await client.user.getProfile();
      console.log(`  ✅ API 连接成功`);
      console.log(`     用户: ${profile.login || '未知'}`);
      if (profile.name) {
        console.log(`     名称: ${profile.name}`);
      }
      return true;
    } catch (apiError) {
      console.error('  ❌ GitCode API 连接失败');
      console.error(`     错误: ${apiError.message}`);
      return false;
    }
  } catch (err) {
    console.error('  ❌ GitCode 客户端初始化失败');
    console.error(`     错误: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 开始环境验证...\n');

  const skipDocker = envBoolean('SKIP_DOCKER');
  const skipGit = envBoolean('SKIP_GIT');
  const skipGitCode = envBoolean('SKIP_GITCODE');

  const results = {
    docker: skipDocker ? null : await checkDocker(),
    git: skipGit ? null : await checkGit(),
    gitcode: skipGitCode ? null : await checkGitCode(),
  };

  // 生成总结报告
  console.log('\n' + '='.repeat(50));
  console.log('📊 环境验证总结\n');

  let allPassed = true;
  const checks = [
    { name: 'Docker', result: results.docker, skipped: skipDocker },
    { name: 'Git', result: results.git, skipped: skipGit },
    { name: 'GitCode', result: results.gitcode, skipped: skipGitCode },
  ];

  for (const check of checks) {
    const status = check.skipped
      ? '⏭️  跳过'
      : check.result
        ? '✅ 通过'
        : '❌ 失败';
    console.log(`${check.name.padEnd(15)} ${status}`);
    if (!check.skipped && !check.result) {
      allPassed = false;
    }
  }

  console.log('='.repeat(50));

  if (allPassed) {
    console.log('\n✅ 所有环境检查通过！');
    process.exit(0);
  } else {
    console.log('\n❌ 部分环境检查失败，请查看上面的详细信息。');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('\n💥 环境验证过程中发生错误:');
    console.error(err);
    process.exit(1);
  });
}
