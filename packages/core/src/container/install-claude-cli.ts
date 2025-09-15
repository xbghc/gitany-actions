import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export async function installClaudeCli({
  container,
  log,
  verbose,
  env,
}: StepOptions): Promise<StepResult> {
  return executeStep({
    container,
    name: 'claude-cli',
    script:
      'mkdir -p ~/.npm-global \
&& npm install -g @anthropic-ai/claude-code --prefix ~/.npm-global \
&& ~/.npm-global/bin/claude -v 2>&1',
    env,
    log,
    verbose,
  });
}
