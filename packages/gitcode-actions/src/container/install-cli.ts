import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

export type InstallCliOptions = Omit<ExecuteStepOptions, 'name' | 'script'> & {
  name: string;
  script: string;
};

export async function installCli({
  container,
  log,
  verbose,
  env,
  name,
  script,
}: InstallCliOptions): Promise<StepResult> {
  return executeStep({
    container,
    name: `${name}-cli`,
    script,
    env,
    log,
    verbose,
  });
}
