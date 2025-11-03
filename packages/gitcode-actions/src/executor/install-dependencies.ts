import type Docker from 'dockerode';
import { executor, StepExecutionError as ContainerStepExecutionError } from './container-executor.js';

export interface InstallOptions {
  container: Docker.Container;
  env?: string[];
}

export interface InstallResult {
  success: boolean;
  output: string;
}

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

/**
 * Installs dependencies in the workspace container.
 *
 * This function attempts to install dependencies using pnpm. It includes a retry
 * mechanism to handle transient network errors, attempting the installation up
 * to 3 times with exponential backoff.
 *
 * @param options - The options for executing the step.
 * @returns A promise that resolves with the result of the step execution.
 */
export async function installDependencies({
  container,
  env,
}: InstallOptions): Promise<InstallResult> {
  let lastResult: InstallResult | undefined;
  let delay = INITIAL_DELAY_MS;

  const installScript = `
        set -e
        cd /tmp/workspace

        echo "Determining pnpm version from package.json..."
        PNPM_VER=$(node -e "try { const s = require('./package.json').packageManager || ''; if (String(s).includes('pnpm@')) { process.stdout.write(String(s).split('pnpm@').pop()); } else { process.stdout.write('latest'); } } catch(e) { process.stdout.write('latest'); }")
        echo "--> Using pnpm version: $PNPM_VER"

        echo "Activating pnpm version..."
        corepack prepare pnpm@$PNPM_VER --activate

        echo "Verifying pnpm version:"
        corepack pnpm --version

        echo "Installing dependencies..."
        corepack pnpm install 2>&1
      `.trim();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await executor(container, { env })
        .execute(installScript, {
          name: `install (attempt ${attempt}/${MAX_RETRIES})`,
        });

      if (result.success) {
        return {
          success: true,
          output: result.steps[0].output,
        };
      }

      lastResult = {
        success: false,
        output: result.steps[0].output,
      };
    } catch (error) {
      lastResult = {
        success: false,
        output: error instanceof ContainerStepExecutionError ? error.output : String(error),
      };
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  return lastResult!;
}
