import type Docker from 'dockerode';
import { type GitcodeClient } from '@gitany/gitcode';
import { collectForwardEnv, docker, logger } from './shared';
import { prepareImage } from './prepare-image';
import { createWorkspaceContainer } from './create-workspace-container';
import { cloneRepo } from './clone-repo';
import { verifySha } from './verify-sha';
import { checkoutSha } from './checkout-sha';
import { installDependencies } from './install-dependencies';
import { installClaudeCli } from './install-claude-cli';
import { installGitcodeCli } from './install-gitcode-cli';
import { executeStep } from './execute-step';

export interface CodeOptions {
  /** Target commit SHA or branch name. */
  baseSha: string;
  /** Node.js version for created container. Defaults to '18'. */
  nodeVersion?: string;
  /** Enable verbose logging. */
  verbose?: boolean;
  /** Override npm registry for installs. Falls back to env then mirror. */
  npmRegistry?: string;
  /** Override pnpm registry for installs. Falls back to env then mirror. */
  pnpmRegistry?: string;
}

export interface CodeResult {
  /** Whether the operation succeeded. */
  success: boolean;
  /** The URL of the created pull request when successful. */
  pullRequestUrl?: string;
  /** Error output when failed. */
  error?: string;
}

export async function code(
  client: GitcodeClient,
  repoUrl: string,
  instruction: string,
  options: CodeOptions,
): Promise<CodeResult> {
  const { baseSha } = options;
  const nodeVersion = options.nodeVersion ?? '18';
  const verbose = options.verbose ?? false;
  const log = logger.child({ scope: 'core:container', func: 'code', baseSha });

  // 1. Permission Check
  log.debug(`checking permissions for ${repoUrl}`);
  try {
    const role = await client.repo.getSelfRepoPermissionRole(repoUrl);
    if (role !== 'admin' && role !== 'write') {
      throw new Error(`Insufficient permissions. Required 'admin' or 'write', but got '${role}'.`);
    }
    log.info(`permission check passed with role: ${role}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error({ err }, `permission check failed: ${error}`);
    return { success: false, error: `Permission check failed: ${error}` };
  }

  const defaultRegistry = 'https://registry.npmmirror.com';
  const npmRegistry = options.npmRegistry ?? process.env.NPM_CONFIG_REGISTRY ?? defaultRegistry;
  const pnpmRegistry = options.pnpmRegistry ?? process.env.PNPM_CONFIG_REGISTRY ?? defaultRegistry;
  const registryEnv = [
    `NPM_CONFIG_REGISTRY=${npmRegistry}`,
    `PNPM_CONFIG_REGISTRY=${pnpmRegistry}`,
  ];

  const forwardedEnv = collectForwardEnv();
  const sharedStepEnv = [...registryEnv, ...forwardedEnv];

  // 2. Container Lifecycle: Always create a new container
  let container: Docker.Container | undefined;

  try {
    const image = `node:${nodeVersion}`;
    await prepareImage({ docker, image, verbose, log });

    container = await createWorkspaceContainer({
      docker,
      image,
      env: [`REPO_URL=${repoUrl}`, `TARGET_SHA=${baseSha}`, ...sharedStepEnv],
      log,
      labels: { 'gitany.task': 'code' },
      repoUrl: repoUrl,
      branch: baseSha,
      reusable: false, // Never reuse code task containers
    });

    const installCli = await installGitcodeCli({ container, log, verbose, env: sharedStepEnv });
    if (!installCli.success) return { success: false, error: installCli.output };
    const clone = await cloneRepo({ container, log, verbose });
    if (!clone.success) return { success: false, error: clone.output };
    const verify = await verifySha({ container, log, verbose });
    if (!verify.success) return { success: false, error: verify.output };
    const checkout = await checkoutSha({ container, log, verbose });
    if (!checkout.success) return { success: false, error: checkout.output };
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

    const branchName = `ai-fix/${instruction.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
    const commitMessage = `feat: ${instruction}`;

    const fullInstruction = `
You are an AI software engineer. Your task is to complete the following request.
You must follow these steps precisely:
1.  Create and check out a new branch named '${branchName}'.
2.  Make the necessary code changes to address the following user request: "${instruction}".
3.  Commit your changes with the message: "${commitMessage}".
4.  Push the new branch to the origin.
5.  Create a pull request using the 'gitcode' CLI tool. The command is pre-installed and authenticated.
6.  The title of the pull request should be "${commitMessage}".
7.  The body of the pull request should be "PR created by AI to address: ${instruction}".
8.  After creating the pull request, output ONLY the full URL of the pull request and nothing else.

User Request: "${instruction}"
`;

    const codeEnv = [...anthropicEnv, ...forwardedEnv, `CLAUDE_INSTRUCTION=${fullInstruction}`];

    const codeStep = await executeStep({
      container,
      name: 'claude',
      script: 'cd /tmp/workspace && ~/.npm-global/bin/claude -p "$CLAUDE_INSTRUCTION" 2>&1',
      env: codeEnv,
      log,
      verbose,
    });

    if (!codeStep.success) {
      return { success: false, error: codeStep.output };
    }

    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = codeStep.output.match(urlRegex);
    const pullRequestUrl = match ? match[0] : undefined;

    if (!pullRequestUrl) {
      log.warn({ output: codeStep.output }, 'could not extract PR URL from AI output');
      return { success: false, error: `Could not extract PR URL from AI output. Raw output: ${codeStep.output}` };
    }

    return { success: true, pullRequestUrl };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error({ err }, `code task failed: ${error}`);
    return { success: false, error: `Code task failed: ${error}` };
  } finally {
    // 3. Container Lifecycle: Always remove the container
    if (container) {
      log.debug('removing container');
      try {
        await container.remove({ force: true });
        log.info('container removed successfully');
      } catch (err) {
        log.warn({ err }, 'failed to remove container');
      }
    }
  }
}
