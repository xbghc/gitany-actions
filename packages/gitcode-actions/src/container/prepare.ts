import type Docker from 'dockerode';
import { executor } from '../executor/container-executor.js';
import { installDependencies } from './install-dependencies.js';

export interface PrepareTarget {
  /** 分支名称 */
  branch?: string;
  /** Git commit SHA */
  sha?: string;
  /** PR 编号 */
  pr?: number;
}

/**
 * 准备容器以运行测试或预览
 *
 * 工作流：
 * 1. 切换到指定版本（branch/sha/pr）
 * 2. 清理脏状态（git clean -fdx）
 * 3. 安装依赖（总是执行）
 *
 * 注意：此函数假设容器中已经克隆了仓库（在 /workspace 目录）
 *
 * @param container - 容器实例
 * @param target - 目标版本
 *
 * @example
 * ```ts
 * // 准备测试 PR
 * await prepare(container, { pr: 123 });
 *
 * // 准备测试特定分支
 * await prepare(container, { branch: 'main' });
 *
 * // 准备测试特定 commit
 * await prepare(container, { sha: 'abc123' });
 * ```
 */
export async function prepare(container: Docker.Container, target: PrepareTarget): Promise<void> {
  const { branch, sha, pr } = target;

  // 1. 切换到指定版本
  if (pr !== undefined) {
    // PR: fetch 并 checkout
    await executor(container)
      .execute(`git fetch origin pull/${pr}/head:pr-${pr}`, {
        name: `Fetch PR ${pr}`,
      })
      .execute(`git checkout pr-${pr}`, {
        name: `Checkout PR ${pr}`,
      });
  } else if (sha) {
    // SHA: 先 fetch 确保有最新数据，然后 checkout
    await executor(container)
      .execute('git fetch origin', {
        name: 'Fetch latest',
      })
      .execute(`git checkout ${sha}`, {
        name: `Checkout ${sha}`,
      });
  } else if (branch) {
    // 分支: fetch 并 checkout
    await executor(container)
      .execute(`git fetch origin ${branch}`, {
        name: `Fetch ${branch}`,
      })
      .execute(`git checkout ${branch}`, {
        name: `Checkout ${branch}`,
      })
      .execute('git pull', {
        name: 'Pull latest',
      });
  } else {
    throw new Error('Must specify either branch, sha, or pr');
  }

  // 2. 清理脏状态
  await executor(container).execute('git clean -fdx', {
    name: '清理未跟踪文件',
  });

  // 3. 总是安装依赖
  await installDependencies(container);
}
