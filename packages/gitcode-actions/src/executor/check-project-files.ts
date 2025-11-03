import type Docker from 'dockerode';
import { executor } from './container-executor.js';
import { collectDiagnostics, type ProjectDiagnostics } from './collect-diagnostics.js';

export interface CheckOptions {
  container: Docker.Container;
}

export interface CheckStepResult {
  success: boolean;
  output: string;
}

export interface ProjectCheckResult {
  step: CheckStepResult;
  diagnostics: ProjectDiagnostics;
}

export async function checkProjectFiles({
  container,
}: CheckOptions): Promise<ProjectCheckResult> {
  const result = await executor(container)
    .execute('ls -la /tmp/workspace/package.json 2>/dev/null', {
      name: '检查 package.json',
    })
    .execute('ls -la /tmp/workspace/pnpm-lock.yaml 2>/dev/null', {
      name: '检查 pnpm-lock.yaml',
    })
    .execute('cat /tmp/workspace/package.json | grep -E "packageManager|lockfileVersion"', {
      name: '检查 pnpm 配置',
    });

  // 聚合所有步骤的输出（供 collectDiagnostics 使用）
  const combinedOutput = result.steps.map((s) => s.output).join('\n');

  const step: CheckStepResult = {
    success: result.success,
    output: combinedOutput,
  };

  const diagnostics = collectDiagnostics(combinedOutput);
  return { step, diagnostics };
}
