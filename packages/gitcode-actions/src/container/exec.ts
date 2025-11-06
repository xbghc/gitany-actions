import type Docker from 'dockerode';
import { getContainerById } from './query.js';
import { execCommand as execCommandInternal } from '../executor/execute-step.js';

export interface ExecOptions {
  /** 工作目录 */
  workDir?: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
}

export interface ExecResult {
  /** 命令退出码 */
  exitCode: number;
  /** 标准输出和标准错误的合并输出 */
  stdout: string;
  /** 标准错误输出 */
  stderr: string;
}

/**
 * 在容器中执行命令
 * 这是一个底层 API，给需要自定义操作的用户
 *
 * @param containerOrId - 容器实例或容器 ID
 * @param command - 要执行的命令（字符串或命令数组）
 * @param options - 执行选项
 * @returns 执行结果
 *
 * @example
 * ```ts
 * // 执行简单命令
 * const result = await exec(container, 'npm install');
 *
 * // 使用选项
 * const result2 = await exec(container, ['git', 'status'], {
 *   workDir: '/workspace',
 *   env: { NODE_ENV: 'production' }
 * });
 *
 * if (result2.exitCode !== 0) {
 *   console.error('Command failed:', result2.stdout);
 * }
 * ```
 */
export async function exec(
  containerOrId: Docker.Container | string,
  command: string | string[],
  options?: ExecOptions,
): Promise<ExecResult> {
  const container =
    typeof containerOrId === 'string' ? await getContainerById(containerOrId) : containerOrId;

  if (!container) {
    throw new Error(`Container not found: ${containerOrId}`);
  }

  // 构建环境变量数组
  const env: string[] = [];
  if (options?.env) {
    for (const [key, value] of Object.entries(options.env)) {
      env.push(`${key}=${value}`);
    }
  }

  // 如果指定了工作目录，使用 cd 命令
  const cmdString = Array.isArray(command) ? command.join(' ') : command;
  const fullCommand = options?.workDir ? `cd ${options.workDir} && ${cmdString}` : cmdString;

  // 使用底层执行函数
  const handle = await execCommandInternal({
    container,
    command: fullCommand,
    env: env.length > 0 ? env : undefined,
  });

  // 应用超时
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = options?.timeout
    ? new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Command timeout after ${options.timeout}ms`));
        }, options.timeout);
      })
    : undefined;

  try {
    const result = timeoutPromise
      ? await Promise.race([handle.wait(), timeoutPromise])
      : await handle.wait();

    return {
      exitCode: result.exitCode,
      stdout: result.output,
      stderr: '', // 当前实现中 stdout 和 stderr 已合并
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
