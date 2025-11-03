import type Docker from 'dockerode';
import { executor } from './container-executor.js';

export interface VerifyOptions {
  container: Docker.Container;
}

export interface VerifyResult {
  success: boolean;
  output: string;
}

export async function verifySha({ container }: VerifyOptions): Promise<VerifyResult> {
  const result = await executor(container)
    .execute('git -C /tmp/workspace rev-parse --verify "$TARGET_SHA"^{commit} >/dev/null 2>&1', {
      name: '验证 SHA/分支存在性',
    });

  // 聚合输出
  const output = result.steps.map((s) => s.output).join('');

  return {
    success: result.success,
    output,
  };
}
