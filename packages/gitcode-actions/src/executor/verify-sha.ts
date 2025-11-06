import type Docker from 'dockerode';
import { executor, StepExecutionError } from './container-executor.js';

/**
 * 验证选项
 */
export interface VerifyOptions {
  /** Docker 容器实例 */
  container: Docker.Container;
}

/**
 * 验证结果
 */
export interface VerifyResult {
  /** 是否验证成功 */
  success: boolean;
  /** 命令输出（成功或失败信息） */
  output: string;
}

/**
 * 验证 SHA/分支是否存在于已克隆的 Git 仓库中
 *
 * 在容器的 `/tmp/workspace` 目录中执行 `git rev-parse --verify` 命令，
 * 验证 `$TARGET_SHA` 环境变量指定的提交或分支是否存在。
 *
 * @param options - 验证选项
 * @returns 验证结果对象
 *
 * @remarks
 * - 要求容器中已设置 `TARGET_SHA` 环境变量
 * - 要求 `/tmp/workspace` 目录中已克隆 Git 仓库
 * - SHA 不存在时**不会抛出异常**，而是返回 `{ success: false, output: "错误信息" }`
 * - 只有非预期的错误才会抛出异常
 *
 * @example
 * ```typescript
 * // 成功情况
 * const result = await verifySha({ container });
 * if (result.success) {
 *   console.log('SHA 验证成功');
 * }
 *
 * // 失败情况（SHA 不存在）
 * const result = await verifySha({ container });
 * if (!result.success) {
 *   console.error('SHA 不存在:', result.output);
 * }
 * ```
 */
export async function verifySha({ container }: VerifyOptions): Promise<VerifyResult> {
  try {
    const result = await executor(container)
      .execute('git -C /tmp/workspace rev-parse --verify "$TARGET_SHA"^{commit} >/dev/null 2>&1', {
        name: '验证 SHA/分支存在性',
      });

    const output = result.steps.map((s) => s.output).join('');

    return {
      success: result.success,
      output,
    };
  } catch (error) {
    if (error instanceof StepExecutionError) {
      return {
        success: false,
        output: error.output,
      };
    }
    throw error;
  }
}
