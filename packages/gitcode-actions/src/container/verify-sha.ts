import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export async function verifySha({ container, log, verbose }: StepOptions): Promise<StepResult> {
  const verify = await executeStep({
    container,
    name: 'verifySha',
    script:
      'cd /tmp/workspace && echo "=== 验证SHA存在性 ===" && echo "目标SHA: $TARGET_SHA" && git cat-file -e "$TARGET_SHA" 2>&1 && echo "SHA验证成功" || echo "SHA不存在"',
    log,
    verbose,
  });
  let output = verify.output;
  let duration = verify.duration;
  if (verify.success) {
    return verify;
  }
  const checkBranch = await executeStep({
    container,
    name: 'checkBranch',
    script:
      'cd /tmp/workspace && git show-ref --verify --quiet "refs/heads/$TARGET_SHA" 2>&1 && echo "是有效分支" || echo "不是有效分支"',
    log,
    verbose,
  });
  output += checkBranch.output;
  duration += checkBranch.duration;
  return { success: checkBranch.success, duration, output };
}
