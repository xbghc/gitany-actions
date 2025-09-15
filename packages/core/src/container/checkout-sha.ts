import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export async function checkoutSha({ container, log, verbose }: StepOptions): Promise<StepResult> {
  return executeStep({
    container,
    name: 'checkout',
    script: 'cd /tmp/workspace && git checkout "$TARGET_SHA" 2>&1',
    log,
    verbose,
  });
}

