import { executeStep } from './execute-step.js';
import type { ExecuteStepOptions, StepResult } from './execute-step.js';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

/**
 * 在容器中安装 Anthropic SDK
 * 安装到项目目录 /tmp/workspace 中
 */
export async function installAnthropicSdk({
  container,
  log,
  verbose,
  env,
}: StepOptions): Promise<StepResult> {
  return executeStep({
    container,
    name: 'install-anthropic-sdk',
    script: 'cd /tmp/workspace && npm install --no-save @anthropic-ai/sdk 2>&1',
    env,
    log,
    verbose,
  });
}
