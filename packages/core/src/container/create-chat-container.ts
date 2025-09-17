import type Docker from 'dockerode';
import { logger, docker, collectForwardEnv } from './shared';
import { prepareImage } from './prepare-image';
import { createWorkspaceContainer } from './create-workspace-container';
import { installGitcodeCli } from './install-gitcode-cli';
import { cloneRepo } from './clone-repo';
import { verifySha } from './verify-sha';
import { checkoutSha } from './checkout-sha';
import { installDependencies } from './install-dependencies';
import { installClaudeCli } from './install-claude-cli';

export interface CreateChatContainerOptions {
  repoUrl: string;
  sha?: string;
  nodeVersion?: string;
  verbose?: boolean;
  npmRegistry?: string;
  pnpmRegistry?: string;
}

export class ChatContainerCreationError extends Error {
  constructor(message: string, public step: string, public details?: unknown) {
    super(message);
    this.name = 'ChatContainerCreationError';
  }
}

export async function createChatContainer(
  options: CreateChatContainerOptions,
): Promise<Docker.Container> {
  const { repoUrl } = options;
  const sha = options.sha ?? 'dev';
  const nodeVersion = options.nodeVersion ?? '18';
  const verbose = options.verbose ?? false;
  const log = logger.child({ scope: 'core:container', func: 'createChatContainer', sha });

  const defaultRegistry = 'https://registry.npmmirror.com';
  const npmRegistry = options.npmRegistry ?? process.env.NPM_CONFIG_REGISTRY ?? defaultRegistry;
  const pnpmRegistry = options.pnpmRegistry ?? process.env.PNPM_CONFIG_REGISTRY ?? defaultRegistry;
  const registryEnv = [
    `NPM_CONFIG_REGISTRY=${npmRegistry}`,
    `PNPM_CONFIG_REGISTRY=${pnpmRegistry}`,
  ];

  const forwardedEnv = collectForwardEnv();
  const sharedStepEnv = [...registryEnv, ...forwardedEnv];

  const image = `node:${nodeVersion}`;
  await prepareImage({ docker, image, verbose, log });

  const container = await createWorkspaceContainer({
    docker,
    image,
    env: [`REPO_URL=${repoUrl}`, `TARGET_SHA=${sha}`, ...sharedStepEnv],
    log,
  });

  try {
    const installCli = await installGitcodeCli({ container, log, verbose, env: sharedStepEnv });
    if (!installCli.success) {
      throw new ChatContainerCreationError('Failed to install gitcode-cli', 'install-gitcode-cli', installCli.output);
    }

    const clone = await cloneRepo({ container, log, verbose });
    if (!clone.success) {
      throw new ChatContainerCreationError('Failed to clone repo', 'clone-repo', clone.output);
    }

    const verify = await verifySha({ container, log, verbose });
    if (!verify.success) {
      throw new ChatContainerCreationError('Failed to verify SHA', 'verify-sha', verify.output);
    }

    const checkout = await checkoutSha({ container, log, verbose });
    if (!checkout.success) {
      throw new ChatContainerCreationError('Failed to checkout SHA', 'checkout-sha', checkout.output);
    }

    const installDeps = await installDependencies({ container, log, verbose, env: sharedStepEnv });
    if (!installDeps.success) {
      throw new ChatContainerCreationError('Failed to install dependencies', 'install-dependencies', installDeps.output);
    }

    const installClaude = await installClaudeCli({ container, log, verbose, env: sharedStepEnv });
    if (!installClaude.success) {
      throw new ChatContainerCreationError('Failed to install claude-cli', 'install-claude-cli', installClaude.output);
    }

    return container;
  } catch (err) {
    // Cleanup container on failure
    try {
      await container.remove({ force: true });
    } catch (removeErr) {
      log.error({ err: removeErr }, 'Failed to remove container after creation failure');
    }
    throw err;
  }
}
