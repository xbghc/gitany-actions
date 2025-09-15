import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';
import { collectDiagnostics, type ProjectDiagnostics } from './collect-diagnostics';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export interface ProjectCheckResult {
  step: StepResult;
  diagnostics: ProjectDiagnostics;
}

export async function checkProjectFiles({ container, log, verbose }: StepOptions): Promise<ProjectCheckResult> {
  const step = await executeStep({
    container,
    name: 'checkProject',
    script:
      'cd /tmp/workspace && echo "=== 检查项目文件 ===" && ls -la package.json 2>/dev/null && ls -la pnpm-lock.yaml 2>/dev/null && echo "=== 检查 package.json ===" && cat package.json | grep -E "packageManager|lockfileVersion" || echo "=== 文件检查完成 ==="',
    log,
    verbose,
  });
  const diagnostics = collectDiagnostics(step.output);
  return { step, diagnostics };
}

