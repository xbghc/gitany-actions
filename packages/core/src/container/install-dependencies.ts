import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

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
  log,
  verbose,
  env,
}: StepOptions): Promise<StepResult> {
  let lastResult: StepResult | undefined;
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await executeStep({
      container,
      name: `install (attempt ${attempt}/${MAX_RETRIES})`,
      script: `
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
      `.trim(),
      env,
      log,
      verbose,
    });

    if (result.success) {
      return result;
    }

    lastResult = result;
    log.warn(`Install dependencies failed on attempt ${attempt}. Retrying in ${delay / 1000}s...`);

    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  log.error('Failed to install dependencies after all retries.');
  return lastResult!;
}
