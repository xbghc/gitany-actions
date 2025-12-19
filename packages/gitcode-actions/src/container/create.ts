import type Docker from 'dockerode';

import { executor } from '../executor/container-executor.js';
import { prepareImage } from './prepare-image.js';
import { collectForwardEnv, docker } from './shared.js';
import { GitCommandBuilder } from './git.js';

/**
 * Configuration for creating a container.
 */
export interface CreateContainerConfig {
  /** Git repository URL */
  repoUrl: string;

  /** Branch to checkout */
  branch?: string;
  /** Commit SHA to checkout */
  sha?: string;
  /** Pull Request number to checkout */
  pr?: number;

  /** Container image (default: node:22-bookworm) */
  image?: string;
  /** Container labels */
  labels?: Record<string, string>;
  /** Container environment variables */
  env?: Record<string, string>;
  /** User to run container as (default: 'node') */
  user?: string;
}

export interface CreateContainerResult {
  /** Unique Container ID */
  id: string;
  /** Docker Container instance */
  container: Docker.Container;
}

/**
 * Create and fully initialize a usable container.
 *
 * Workflow:
 * 1. Pull image (if not cached)
 * 2. Create container
 * 3. Clone repository to /workspace
 * 4. Checkout specified version
 *
 * @param config - The container configuration
 * @returns The created container result
 *
 * @example
 * ```ts
 * const { id, container } = await createContainer({
 *   repoUrl: 'https://gitcode.com/owner/repo',
 *   branch: 'main'
 * });
 * // Manually install dependencies
 * await executor(container).execute('pnpm install');
 * ```
 */
export async function createContainer(
  config: CreateContainerConfig,
): Promise<CreateContainerResult> {
  // Validation
  if (!config.repoUrl) {
    throw new Error('repoUrl is required');
  }

  const versionCount = [config.branch, config.sha, config.pr].filter(
    (v) => v !== undefined,
  ).length;
  if (versionCount > 1) {
    throw new Error('Only one of branch, sha, or pr can be specified');
  }

  const {
    repoUrl,
    branch,
    sha,
    pr,
    image = 'node:22-bookworm',
    labels = {},
    env = {},
    user = 'node',
  } = config;

  // 1. Prepare image
  await prepareImage({ docker, image });

  // 2. Build environment variables
  const envVars = [...collectForwardEnv()];
  for (const [key, value] of Object.entries(env)) {
    envVars.push(`${key}=${value}`);
  }

  // 3. Create container
  const container = await docker.createContainer({
    Image: image,
    Cmd: ['sh', '-lc', 'tail -f /dev/null'],
    Env: envVars,
    User: user,
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
    const exec = executor(container);

    // 4. Configure Git credentials
    await exec.execute(GitCommandBuilder.configureCredentials(), {
      name: 'Configure Git Credentials',
    });

    // 5. Clone repository
    await exec.execute(GitCommandBuilder.clone(repoUrl, '/workspace'), {
      name: 'Clone Repository',
    });

    // 6. Checkout version
    if (pr !== undefined) {
      // PR: fetch and checkout
      await exec
        .execute(GitCommandBuilder.fetchPr(pr), {
          name: `Fetch PR ${pr}`,
        })
        .execute(GitCommandBuilder.checkout(`pr-${pr}`), {
          name: `Checkout PR ${pr}`,
        });
    } else if (sha) {
      // SHA: checkout
      await exec.execute(GitCommandBuilder.checkout(sha), {
        name: `Checkout ${sha}`,
      });
    } else if (branch) {
      // Branch: checkout
      await exec.execute(GitCommandBuilder.checkout(branch), {
        name: `Checkout ${branch}`,
      });
    }
    // Otherwise use default branch (state after clone)

    return {
      id: containerId,
      container,
    };
  } catch (error) {
    // Initialization failed, cleanup container
    try {
      await container.stop({ t: 0 });
      await container.remove({ force: true });
    } catch {
      // Ignore cleanup error
    }
    throw error;
  }
}
