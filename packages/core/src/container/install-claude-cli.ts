import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export async function installClaudeCli({
  container,
  log,
  verbose,
}: StepOptions): Promise<StepResult> {
  return executeStep({
    container,
    name: 'claude-cli',
    script: 'corepack pnpm add -g @anthropic-ai/claude-code && claude -v 2>&1',
    log,
    verbose,
  });
}
