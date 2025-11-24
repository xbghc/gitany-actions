import type { PullRequest } from '@xbghc/gitcode-api';
import { toGitUrl } from '@xbghc/gitcode-api';
import type Docker from 'dockerode';

import { executor } from '../executor/container-executor.js';
import { prepareImage } from './prepare-image.js';
import { collectForwardEnv, docker } from './shared.js';

export interface CreateContainerConfig {
  /** Git 仓库 URL */
  repoUrl: string;

  /** 代码版本（三选一） */
  branch?: string;
  sha?: string;
  pr?: number;

  /** 容器配置 */
  image?: string;
  labels?: Record<string, string>;
  env?: Record<string, string>;
}

export interface CreateContainerResult {
  /** 容器唯一 ID */
  id: string;
  /** Docker 容器实例 */
  container: Docker.Container;
}

/**
 * 创建并完全初始化一个可用的容器
 *
 * 工作流：
 * 1. 拉取镜像（如未缓存）
 * 2. 创建容器
 * 3. 克隆仓库到 /workspace
 * 4. checkout 到指定版本
 *
 * @example
 * ```ts
 * const { id, container } = await createContainer({
 *   repoUrl: 'https://gitcode.com/owner/repo',
 *   branch: 'main'
 * });
 * // 手动安装依赖
 * await executor(container).execute('pnpm install');
 * ```
 *
 * @todo 重构
 */
export async function createContainer(
  config: CreateContainerConfig,
): Promise<CreateContainerResult> {
  const { repoUrl, branch, sha, pr, image = 'node:22-bookworm', labels = {}, env = {} } = config;

  // 1. 准备镜像
  await prepareImage({ docker, image });

  // 2. 构建环境变量
  const envVars = [...collectForwardEnv()];
  for (const [key, value] of Object.entries(env)) {
    envVars.push(`${key}=${value}`);
  }

  // 3. 创建容器
  const container = await docker.createContainer({
    Image: image,
    Cmd: ['sh', '-lc', 'tail -f /dev/null'],
    Env: envVars,
    User: 'node',
    WorkingDir: '/workspace',
    HostConfig: { AutoRemove: false },
    Labels: {
      'gitcode.managed': 'true',
      ...labels,
    },
  });

  await container.start();

  const info = await container.inspect();
  const containerId = info.Id;

  try {
    // 4. 克隆仓库
    await executor(container).execute(`git clone ${repoUrl} /workspace`, {
      name: '克隆仓库',
    });

    // 5. checkout 到指定版本
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
      // SHA: 直接 checkout
      await executor(container).execute(`git checkout ${sha}`, {
        name: `Checkout ${sha}`,
      });
    } else if (branch) {
      // 分支: checkout
      await executor(container).execute(`git checkout ${branch}`, {
        name: `Checkout ${branch}`,
      });
    }
    // 否则使用默认分支（clone 后的默认状态）

    return {
      id: containerId,
      container,
    };
  } catch (error) {
    // 初始化失败，清理容器
    try {
      await container.stop({ t: 0 });
      await container.remove({ force: true });
    } catch {
      // 忽略清理错误
    }
    throw error;
  }
}
