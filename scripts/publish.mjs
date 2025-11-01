#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run');

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

function success(msg) {
  log(`✓ ${msg}`, colors.green);
}

function error(msg) {
  log(`✗ ${msg}`, colors.red);
}

function warn(msg) {
  log(`⚠ ${msg}`, colors.yellow);
}

function info(msg) {
  log(`ℹ ${msg}`, colors.cyan);
}

function title(msg) {
  console.log();
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.blue);
  log(msg, colors.bold + colors.blue);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.blue);
}

// 执行命令
function exec(cmd, silent = false) {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: ROOT_DIR
    });
  } catch (err) {
    if (!silent) throw err;
    return null;
  }
}

// 交互式确认
function ask(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question} (y/n): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// 读取 package.json
function readPackageJson(pkgPath) {
  const fullPath = join(ROOT_DIR, pkgPath, 'package.json');
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

// 检查 npm 上的版本
async function checkNpmVersion(packageName, localVersion) {
  try {
    // 获取 npm 上的所有版本
    const result = exec(`npm view ${packageName} versions --json`, true);
    if (!result) {
      // 包不存在，首次发布
      return { isNew: true, latestVersion: null, needsUpdate: false };
    }

    const versions = JSON.parse(result);
    const versionArray = Array.isArray(versions) ? versions : [versions];
    const latestVersion = versionArray[versionArray.length - 1];

    // 检查当前版本是否已存在
    const versionExists = versionArray.includes(localVersion);

    // 比较版本号
    const needsUpdate = versionExists || compareVersions(localVersion, latestVersion) <= 0;

    return {
      isNew: false,
      latestVersion,
      versionExists,
      needsUpdate,
      localVersion,
    };
  } catch (err) {
    // 包可能不存在
    return { isNew: true, latestVersion: null, needsUpdate: false };
  }
}

// 简单的版本号比较（支持 semver）
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}

// 建议下一个版本号
function suggestNextVersion(currentVersion) {
  const parts = currentVersion.split('.').map(Number);
  return [
    `${parts[0]}.${parts[1]}.${parts[2] + 1}`, // patch
    `${parts[0]}.${parts[1] + 1}.0`,           // minor
    `${parts[0] + 1}.0.0`,                     // major
  ];
}

// 待发布的包配置（按依赖顺序）
const packages = [
  { name: '@xbghc/gitcode-api', path: 'packages/gitcode-api' },
  { name: '@xbghc/git-lib', path: 'packages/git-lib' },
  { name: '@xbghc/gitcode-cli', path: 'packages/gitcode-cli' },
];

// 主流程
async function main() {
  if (isDryRun) {
    warn('🧪 Dry-run 模式：只执行检查，不会实际发布');
  }

  title('🔍 发布前检查');

  // 1. 检查 Git 状态
  const gitStatus = exec('git status --porcelain', true);
  if (gitStatus && gitStatus.trim()) {
    error('Git 工作区不干净，请先提交或暂存更改');
    process.exit(1);
  }
  success('Git 工作区干净');

  // 2. 检查当前分支
  const currentBranch = exec('git branch --show-current', true).trim();
  info(`当前分支: ${currentBranch}`);

  // 3. 检查 npm 登录状态
  const npmUser = exec('npm whoami', true);
  if (!npmUser) {
    error('未登录 npm，请先运行: npm login');
    process.exit(1);
  }
  success(`npm 已登录: ${npmUser.trim()}`);

  // 4. 版本检查
  title('📦 版本检查');

  const versionChecks = [];
  let hasVersionIssue = false;

  for (const pkg of packages) {
    const pkgJson = readPackageJson(pkg.path);
    const versionInfo = await checkNpmVersion(pkg.name, pkgJson.version);

    console.log();
    log(`${pkg.name}`, colors.bold);

    if (versionInfo.isNew) {
      success(`  首次发布: ${pkgJson.version}`);
    } else {
      info(`  npm 最新版本: ${versionInfo.latestVersion}`);
      info(`  本地版本: ${versionInfo.localVersion}`);

      if (versionInfo.versionExists) {
        error(`  版本号已存在于 npm！`);
        const suggestions = suggestNextVersion(pkgJson.version);
        warn(`  建议版本: ${suggestions.join(' / ')}`);
        hasVersionIssue = true;
      } else if (versionInfo.needsUpdate) {
        error(`  版本号未更新或倒退！`);
        const suggestions = suggestNextVersion(versionInfo.latestVersion);
        warn(`  建议版本: ${suggestions.join(' / ')}`);
        hasVersionIssue = true;
      } else {
        success(`  版本号有效（新版本）`);
      }
    }

    versionChecks.push({ pkg, versionInfo, pkgJson });
  }

  if (hasVersionIssue) {
    console.log();
    error('❌ 版本检查失败，请更新版本号后重试');
    process.exit(1);
  }

  // 5. 构建检查
  title('🔨 构建和检查');

  const runCheck = await ask('运行构建和类型检查？');
  if (runCheck) {
    info('运行 pnpm build...');
    exec('pnpm build');
    success('构建完成');

    info('运行 pnpm typecheck...');
    exec('pnpm typecheck');
    success('类型检查通过');

    info('运行 pnpm lint...');
    exec('pnpm lint');
    success('代码检查通过');
  }

  // 6. 确认发布
  title('🚀 准备发布');

  console.log();
  log('将按以下顺序发布包：', colors.bold);
  versionChecks.forEach(({ pkg, pkgJson }, index) => {
    log(`  ${index + 1}. ${pkg.name}@${pkgJson.version}`);
  });
  console.log();

  if (isDryRun) {
    warn('Dry-run 模式：跳过实际发布');
    return;
  }

  const confirmPublish = await ask('确认发布以上包？');
  if (!confirmPublish) {
    warn('取消发布');
    process.exit(0);
  }

  // 7. 发布
  title('📤 发布中...');

  const publishedPackages = [];

  for (const { pkg, pkgJson } of versionChecks) {
    console.log();
    info(`发布 ${pkg.name}@${pkgJson.version}...`);

    try {
      exec(`pnpm publish --filter ${pkg.name} --access public --no-git-checks`);
      success(`${pkg.name}@${pkgJson.version} 发布成功`);
      publishedPackages.push({ name: pkg.name, version: pkgJson.version });
    } catch (err) {
      error(`${pkg.name} 发布失败`);
      console.error(err);

      if (publishedPackages.length > 0) {
        warn('部分包已发布，请手动处理剩余包');
      }
      process.exit(1);
    }
  }

  // 8. 创建 Git tags
  title('🏷️  创建 Git Tags');

  const createTags = await ask('创建 Git tags？');
  if (createTags) {
    for (const { name, version } of publishedPackages) {
      const tag = `${name}@${version}`;
      exec(`git tag ${tag}`);
      success(`创建 tag: ${tag}`);
    }

    const pushTags = await ask('推送 tags 到远程？');
    if (pushTags) {
      exec('git push --tags');
      success('Tags 已推送');
    }
  }

  // 9. 完成
  title('✨ 发布完成');

  console.log();
  log('已发布的包：', colors.bold + colors.green);
  publishedPackages.forEach(({ name, version }) => {
    log(`  ${name}@${version}`);
    log(`  https://www.npmjs.com/package/${name}/v/${version}`, colors.cyan);
  });
  console.log();
}

// 运行
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
