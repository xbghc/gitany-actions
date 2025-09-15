import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export async function cloneRepo({ container, log, verbose }: StepOptions): Promise<StepResult> {
  return executeStep({
    container,
    name: 'clone',
    script: 'rm -rf /tmp/workspace && git clone "$REPO_URL" /tmp/workspace 2>&1',
    log,
    verbose,
  });
}

