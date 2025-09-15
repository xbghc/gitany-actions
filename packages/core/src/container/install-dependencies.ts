import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export async function installDependencies({ container, log, verbose }: StepOptions): Promise<StepResult> {
  return executeStep({
    container,
    name: 'install',
    script:
      `cd /tmp/workspace && PNPM_VER=$(node -e "try{const s=require('./package.json').packageManager||''; if(String(s).includes('pnpm@')){process.stdout.write(String(s).split('pnpm@').pop());}else{process.stdout.write('latest')}}catch(e){process.stdout.write('latest')}") && corepack prepare pnpm@$PNPM_VER --activate && corepack pnpm --version && corepack pnpm install 2>&1`,
    log,
    verbose,
  });
}

