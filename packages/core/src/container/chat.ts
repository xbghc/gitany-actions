import type Docker from 'dockerode';
import { collectForwardEnv, logger } from './shared';
import { executeStep } from './execute-step';
import { createChatContainer, ChatContainerCreationError } from './create-chat-container';

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
  const verbose = options.verbose ?? false;
  const keepContainer = options.keepContainer ?? false;
  const log = logger.child({ scope: 'core:container', func: 'chat', sha });

  const forwardedEnv = collectForwardEnv();

  let container = options.container;
  const createdContainer = !container;

  try {
    if (!container) {
      try {
        container = await createChatContainer({
          repoUrl,
          sha,
          nodeVersion: options.nodeVersion,
          verbose: options.verbose,
          npmRegistry: options.npmRegistry,
          pnpmRegistry: options.pnpmRegistry,
        });
      } catch (err) {
        if (err instanceof ChatContainerCreationError) {
          return { success: false, error: `Container creation failed at step ${err.step}: ${err.message}` };
        }
        return { success: false, error: 'Container creation failed' };
      }
    } else {
      // For existing containers, reset the workspace to a clean state.
      const resetStep = await executeStep({
        container,
        name: 'git-reset',
        script: 'cd /tmp/workspace && git reset --hard HEAD && git clean -fdx',
        log,
        verbose,
      });
      if (!resetStep.success) {
        return { success: false, error: `Failed to reset workspace: ${resetStep.output}` };
      }
    }

    const anthropicEnv: string[] = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('ANTHROPIC_') && typeof value === 'string') {
        anthropicEnv.push(`${key}=${value}`);
      }
    }

    const chatEnv = [...anthropicEnv, ...forwardedEnv];

    const chatStep = await executeStep({
      container,
      name: 'claude',
      script:
        `cd /tmp/workspace && ~/.npm-global/bin/claude -p ${JSON.stringify(
          question,
        )} 2>&1`,
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
