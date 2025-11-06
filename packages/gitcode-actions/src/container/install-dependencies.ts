import type Docker from 'dockerode';
import { executor } from '../executor/container-executor.js';
import { exec } from './exec.js';

export interface InstallDependenciesOptions {
  /** 包管理器，auto 表示自动检测 */
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'auto';
  /** 强制重装（删除 node_modules） */
  force?: boolean;
  /** npm 镜像源 */
  registry?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
}

export interface InstallDependenciesResult {
  /** 使用的包管理器 */
  packageManager: string;
  /** 安装耗时（毫秒） */
  duration: number;
}

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

/**
 * 检测项目使用的包管理器
 *
 * 优先级：
 * 1. package.json 中的 packageManager 字段
 * 2. 锁文件（pnpm-lock.yaml > yarn.lock > package-lock.json）
 * 3. 默认 npm
 */
async function detectPackageManager(container: Docker.Container): Promise<string> {
  try {
    // 检查 package.json 的 packageManager 字段
    const result = await exec(
      container,
      `node -e "try { const pm = require('/workspace/package.json').packageManager; if (pm) console.log(pm.split('@')[0]); } catch(e) {}"`,
    );

    if (result.exitCode === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }

    // 检查锁文件
    const lockFiles = [
      { file: 'pnpm-lock.yaml', manager: 'pnpm' },
      { file: 'yarn.lock', manager: 'yarn' },
      { file: 'package-lock.json', manager: 'npm' },
    ];

    for (const { file, manager } of lockFiles) {
      const checkResult = await exec(container, `test -f /workspace/${file}`);
      if (checkResult.exitCode === 0) {
        return manager;
      }
    }

    // 默认使用 npm
    return 'npm';
  } catch {
    return 'npm';
  }
}

/**
 * 安装项目依赖
 *
 * 工作流：
 * 1. 检测包管理器（如果未指定）
 * 2. 设置镜像源（如果指定）
 * 3. 清理缓存（如果 force=true）
 * 4. 执行安装（支持重试）
 *
 * @param container - 容器实例
 * @param options - 安装选项
 * @returns 安装结果
 *
 * @example
 * ```ts
 * // 自动检测并安装
 * const result = await installDependencies(container);
 *
 * // 指定包管理器和镜像源
 * const result2 = await installDependencies(container, {
 *   packageManager: 'pnpm',
 *   registry: 'https://registry.npmmirror.com'
 * });
 *
 * // 强制重装
 * const result3 = await installDependencies(container, {
 *   force: true
 * });
 * ```
 */
// TODO 移除，一句命令的事，让用户自己写
export async function installDependencies(
  container: Docker.Container,
  options?: InstallDependenciesOptions,
): Promise<InstallDependenciesResult> {
  const startTime = Date.now();

  // 1. 确定包管理器
  let packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm';
  const pmOption = options?.packageManager || 'auto';
  if (pmOption === 'auto') {
    const detected = await detectPackageManager(container);
    packageManager =
      detected === 'npm' || detected === 'pnpm' || detected === 'yarn' ? detected : 'npm';
  } else {
    packageManager = pmOption;
  }

  // 2. 强制重装：删除 node_modules
  if (options?.force) {
    await executor(container).execute('rm -rf /workspace/node_modules', {
      name: '删除 node_modules',
    });
  }

  // 3. 构建安装命令
  const installCmd = buildInstallCommand(packageManager, options?.registry);

  // 4. 执行安装（带重试）
  let lastError: Error | undefined;
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await executor(container).execute(installCmd, {
        name: `安装依赖 (${attempt}/${MAX_RETRIES})`,
      });

      const duration = Date.now() - startTime;
      return { packageManager, duration };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果不是最后一次尝试，等待后重试
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // 指数退避
      }
    }
  }

  // 所有尝试都失败
  throw new Error(
    `Failed to install dependencies after ${MAX_RETRIES} attempts: ${lastError?.message}`,
  );
}

/**
 * 构建安装命令
 */
function buildInstallCommand(packageManager: string, registry?: string): string {
  const commands: string[] = [];

  // 切换到工作目录
  commands.push('cd /workspace');

  // 设置镜像源（如果指定）
  if (registry) {
    if (packageManager === 'npm') {
      commands.push(`npm config set registry ${registry}`);
    } else if (packageManager === 'yarn') {
      commands.push(`yarn config set registry ${registry}`);
    } else if (packageManager === 'pnpm') {
      commands.push(`pnpm config set registry ${registry}`);
    }
  }

  // 根据包管理器构建安装命令
  if (packageManager === 'pnpm') {
    // 使用 corepack 激活 pnpm
    commands.push(
      'PNPM_VER=$(node -e "try { const s = require(\\"/workspace/package.json\\").packageManager || \\"\\"; if (String(s).includes(\\"pnpm@\\")) { process.stdout.write(String(s).split(\\"pnpm@\\").pop()); } else { process.stdout.write(\\"latest\\"); } } catch(e) { process.stdout.write(\\"latest\\"); }")',
    );
    commands.push('corepack prepare pnpm@$PNPM_VER --activate');
    commands.push('corepack pnpm install');
  } else if (packageManager === 'yarn') {
    commands.push('yarn install');
  } else {
    commands.push('npm install');
  }

  return commands.join(' && ');
}
