import type Docker from 'dockerode';
import { executor } from '../executor/container-executor.js';
import { installDependencies } from './install-dependencies.js';

export interface ResetContainerOptions {
  /** 重置后 checkout 到的分支 */
  branch?: string;
  /** 是否重新安装依赖 */
  reinstallDeps?: boolean;
}

/**
 * 重置容器到干净状态
 *
 * 工作流：
 * 1. 清理所有未跟踪文件（git clean -fdx）
 * 2. 重置所有修改（git reset --hard）
 * 3. checkout 到指定分支（如果指定）
 * 4. 可选：重新安装依赖
 *
 * @param container - 容器实例
 * @param options - 重置选项
 *
 * @example
 * ```ts
 * // 重置到当前分支的干净状态
 * await resetContainer(container);
 *
 * // 重置并切换到 main 分支
 * await resetContainer(container, { branch: 'main' });
 *
 * // 重置并重新安装依赖
 * await resetContainer(container, {
 *   branch: 'main',
 *   reinstallDeps: true
 * });
 * ```
 */
export async function resetContainer(
  container: Docker.Container,
  options?: ResetContainerOptions,
): Promise<void> {
  // 1. 清理未跟踪文件
  await executor(container).execute('git clean -fdx', {
    name: '清理未跟踪文件',
  });

  // 2. 重置所有修改
  await executor(container).execute('git reset --hard HEAD', {
    name: '重置所有修改',
  });

  // 3. 切换分支（如果指定）
  if (options?.branch) {
    await executor(container)
      .execute(`git fetch origin ${options.branch}`, {
        name: `Fetch ${options.branch}`,
      })
      .execute(`git checkout ${options.branch}`, {
        name: `Checkout ${options.branch}`,
      })
      .execute('git pull', {
        name: 'Pull latest',
      });
  }

  // 4. 重新安装依赖（如果需要）
  if (options?.reinstallDeps) {
    await installDependencies(container, { force: true });
  }
}
