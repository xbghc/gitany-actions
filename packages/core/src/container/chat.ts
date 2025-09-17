import type Docker from 'dockerode';
import { collectForwardEnv, docker, logger } from './shared';
import { prepareImage } from './prepare-image';
import { getDevContainer } from './get-dev-container';
import { createWorkspaceContainer } from './create-workspace-container';
import { cloneRepo } from './clone-repo';
import { verifySha } from './verify-sha';
import { checkoutSha } from './checkout-sha';
import { installDependencies } from './install-dependencies';
import { installClaudeCli } from './install-claude-cli';
import { installGitcodeCli } from './install-gitcode-cli';
import { executeStep } from './execute-step';

export interface ChatOptions {
  /** Optional existing container to use. */
  container?: Docker.Container;
  /** Target commit SHA or branch name. Defaults to 'dev'. */
  sha?: string;
  /** Node.js version for created container. Defaults to '18'. */
  nodeVersion?: string;
  /** Keep the container after completion when created internally. */
  keepContainer?: boolean;
  /** Enable verbose logging. */
  verbose?: boolean;
  /** Override npm registry for installs. Falls back to env then mirror. */
  npmRegistry?: string;
  /** Override pnpm registry for installs. Falls back to env then mirror. */
  pnpmRegistry?: string;
}

export interface ChatResult {
  /** Whether the conversation succeeded. */
  success: boolean;
  /** Claude's response when successful. */
  output?: string;
  /** Error output when failed. */
  error?: string;
}

export async function chat(
  repoUrl: string,
  question: string,
  options: ChatOptions = {},
): Promise<ChatResult> {
  const sha = options.sha ?? 'dev';
  const nodeVersion = options.nodeVersion ?? '18';
  const verbose = options.verbose ?? false;
  let keepContainer = options.keepContainer ?? false;
  const log = logger.child({ scope: 'core:container', func: 'chat', sha });

  const defaultRegistry = 'https://registry.npmmirror.com';
  const npmRegistry = options.npmRegistry ?? process.env.NPM_CONFIG_REGISTRY ?? defaultRegistry;
  const pnpmRegistry = options.pnpmRegistry ?? process.env.PNPM_CONFIG_REGISTRY ?? defaultRegistry;
  const registryEnv = [
    `NPM_CONFIG_REGISTRY=${npmRegistry}`,
    `PNPM_CONFIG_REGISTRY=${pnpmRegistry}`,
  ];

  const forwardedEnv = collectForwardEnv();
  const sharedStepEnv = [...registryEnv, ...forwardedEnv];

  let container = options.container;
  if (!container && sha === 'dev') {
    container = await getDevContainer();
    if (container) {
      log.debug(' reusing dev container');
    }
  }
  const createdContainer = !container;

  try {
    if (!container) {
      const image = `node:${nodeVersion}`;
      await prepareImage({ docker, image, verbose, log });

      const labels: Record<string, string> = {};
      if (sha === 'dev') {
        labels['gitany.branch'] = 'dev';
        keepContainer = true;
      }

      container = await createWorkspaceContainer({
        docker,
        image,
        env: [`REPO_URL=${repoUrl}`, `TARGET_SHA=${sha}`, ...sharedStepEnv],
        log,
        labels,
      });
      const installCli = await installGitcodeCli({ container, log, verbose, env: sharedStepEnv });
      if (!installCli.success) return { success: false, error: installCli.output };
      const clone = await cloneRepo({ container, log, verbose });
      if (!clone.success) return { success: false, error: clone.output };
      const verify = await verifySha({ container, log, verbose });
      if (!verify.success) return { success: false, error: verify.output };
      const checkout = await checkoutSha({ container, log, verbose });
      if (!checkout.success) return { success: false, error: checkout.output };
    }

    const installDeps = await installDependencies({ container, log, verbose, env: sharedStepEnv });
    if (!installDeps.success) return { success: false, error: installDeps.output };
    const installClaude = await installClaudeCli({ container, log, verbose, env: sharedStepEnv });
    if (!installClaude.success) return { success: false, error: installClaude.output };

    const anthropicEnv: string[] = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('ANTHROPIC_') && typeof value === 'string') {
        anthropicEnv.push(`${key}=${value}`);
      }
    }

    const chatEnv = [...anthropicEnv, ...forwardedEnv, `CLAUDE_QUESTION=${question}`];

    const chatStep = await executeStep({
      container,
      name: 'claude',
      script: 'cd /tmp/workspace && ~/.npm-global/bin/claude -p "$CLAUDE_QUESTION" 2>&1',
      env: chatEnv,
      log,
      verbose,
    });
    if (!chatStep.success) {
      return { success: false, error: chatStep.output };
    }
    return { success: true, output: chatStep.output };
  } finally {
    if (createdContainer && container && !keepContainer) {
      try {
        await container.remove({ force: true });
      } catch {
        /* ignore */
      }
    }
  }
}
