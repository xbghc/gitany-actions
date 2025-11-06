import type Docker from 'dockerode';
import { execCommand } from './execute-step.js';

/**
 * ContainerExecutor 构造函数选项
 */
export interface ExecutorOptions {
  /** 全局环境变量，应用到所有步骤 */
  env?: string[];
}

/**
 * 步骤选项
 */
export interface StepOptions {
  /** 步骤名称，未指定则使用命令作为名称 */
  name?: string;
  /** 步骤级环境变量，会与全局 env 合并 */
  env?: string[];
}

/**
 * 步骤执行结果
 */
export interface StepResult {
  /** 步骤名称 */
  name: string;
  /** 是否成功（exitCode === 0） */
  success: boolean;
  /** 退出码 */
  exitCode: number;
  /** 完整输出 */
  output: string;
}

/**
 * 执行上下文，包含已执行步骤的结果
 */
export interface ExecutionContext {
  /** 所有已执行步骤的结果 */
  steps: StepResult[];
  /** 最后一个步骤的结果 */
  last: StepResult;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  /** 整体是否成功（所有步骤都成功） */
  success: boolean;
  /** 所有步骤结果 */
  steps: StepResult[];
}

/**
 * 步骤执行错误
 */
export class StepExecutionError extends Error {
  constructor(
    message: string,
    public readonly stepName: string,
    public readonly exitCode: number,
    public readonly output: string,
  ) {
    super(message);
    this.name = 'StepExecutionError';
  }
}

/**
 * ExecutorChain - 链式执行 Docker 容器命令（Thenable）
 *
 * @example
 * ```typescript
 * // 基础用法
 * await executor(container)
 *   .execute('pnpm install')
 *   .execute('pnpm build')
 *
 * // 全局环境变量
 * await executor(container, {
 *   env: ['NODE_ENV=production']
 * })
 *   .execute('pnpm install')
 *   .execute('pnpm build')
 *
 * // 步骤选项
 * await executor(container)
 *   .execute('pnpm install', { name: '安装依赖' })
 *   .execute('pnpm build', { name: '构建', env: ['CI=true'] })
 *
 * // 错误处理
 * await executor(container)
 *   .execute('pnpm install')
 *   .execute('pnpm build')
 *   .catch((error) => {
 *     if (error instanceof StepExecutionError) {
 *       console.error(`步骤 ${error.stepName} 失败`);
 *     }
 *   })
 * ```
 */
export class ExecutorChain implements PromiseLike<ExecutionResult> {
  private container: Docker.Container;
  private globalEnv?: string[];
  private promise: Promise<ExecutionResult>;
  private results: StepResult[] = [];

  constructor(container: Docker.Container, options?: ExecutorOptions) {
    this.container = container;
    this.globalEnv = options?.env;
    // 初始化为已完成的 Promise
    this.promise = Promise.resolve({ success: true, steps: [] });
  }

  /**
   * 执行命令
   *
   * @param command - 要执行的命令
   * @param options - 步骤选项
   * @returns this，支持链式调用
   */
  execute(command: string, options?: StepOptions): this {
    this.promise = this.promise.then(async () => {
      const env = this.mergeEnv(options?.env);
      const name = options?.name ?? command;

      const execution = await execCommand({
        container: this.container,
        command,
        env,
      });

      const result = await execution.wait();

      const stepResult: StepResult = {
        name,
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        output: result.output,
      };

      this.results.push(stepResult);

      // 如果失败，抛出异常（快速失败）
      if (!stepResult.success) {
        throw new StepExecutionError(
          `步骤 "${name}" 执行失败`,
          name,
          stepResult.exitCode,
          stepResult.output,
        );
      }

      return {
        success: true,
        steps: [...this.results],
      };
    });

    return this;
  }

  /**
   * 实现 PromiseLike 接口，使 ExecutorChain 可以被 await
   */
  then<TResult1 = ExecutionResult, TResult2 = never>(
    onfulfilled?: ((value: ExecutionResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  /**
   * 处理执行失败
   */
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined,
  ): Promise<ExecutionResult | TResult> {
    return this.promise.catch(onrejected);
  }

  /**
   * 无论成功失败都会执行
   */
  finally(onfinally?: (() => void) | null | undefined): Promise<ExecutionResult> {
    return this.promise.finally(onfinally);
  }

  /**
   * 合并全局和步骤级环境变量
   *
   * @private
   * @param stepEnv - 步骤级环境变量
   * @returns 合并后的环境变量
   */
  private mergeEnv(stepEnv?: string[]): string[] {
    return [...(this.globalEnv ?? []), ...(stepEnv ?? [])];
  }
}

/**
 * 创建 ExecutorChain 实例的工厂函数
 *
 * @param container - Docker 容器实例
 * @param options - 执行器选项
 * @returns ExecutorChain 实例
 *
 * @example
 * ```typescript
 * await executor(container)
 *   .execute('pnpm install')
 *   .execute('pnpm build')
 * ```
 */
export function executor(container: Docker.Container, options?: ExecutorOptions): ExecutorChain {
  return new ExecutorChain(container, options);
}

// 保留 ContainerExecutor 作为 ExecutorChain 的别名以保持向后兼容（如果需要）
export const ContainerExecutor = ExecutorChain;
