import { installCli } from './install-cli';
import type { ExecuteStepOptions, StepResult } from './execute-step';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export async function installClaudeCli({
  container,
  log,
  verbose,
  env,
}: StepOptions): Promise<StepResult> {
  return installCli({
    container,
    name: 'claude',
    script:
      'mkdir -p ~/.npm-global \
&& npm install -g @anthropic-ai/claude-code --prefix ~/.npm-global \
&& ~/.npm-global/bin/claude -v 2>&1',
    env,
    log,
    verbose,
  });
}
