import type Docker from 'dockerode';
import { PassThrough } from 'node:stream';
import type { ContainerWithModem } from './docker-types.js';

export interface ExecuteStepOptions {
  container: Docker.Container;
  name: string;
  script: string;
  /** Environment variables to provide to the command. */
  env?: string[];
}

export interface StepResult {
  success: boolean;
  duration: number;
  output: string;
}

export class StepExecutionError extends Error {
  duration: number;
  constructor(message: string, duration: number) {
    super(message);
    this.duration = duration;
  }
}

export interface ExecuteOptions {
  container: Docker.Container;
  command: string;
  /** Environment variables to provide to the command. */
  env?: string[];
}

export interface ExecuteResult {
  exitCode: number;
  output: string;
}

export interface ExecutionHandle {
  /** 输出流，可实时监听 data 事件 */
  stream: NodeJS.ReadableStream;
  /** 等待执行完成并获取结果 */
  wait(): Promise<ExecuteResult>;
}

/**
 * 创建等待 Docker exec 执行完成的 Promise
 *
 * @internal 内部辅助函数，不对外导出
 * @param stream - Docker exec 的原始流
 * @param stdoutStream - 标准输出流
 * @param stderrStream - 标准错误流
 * @param exec - Docker exec 实例
 * @param getOutput - 获取完整输出的函数
 * @returns Promise，resolve 时返回 ExecuteResult
 */
function createWaitPromise(
  stream: NodeJS.ReadableStream,
  stdoutStream: PassThrough,
  stderrStream: PassThrough,
  exec: Docker.Exec,
  getOutput: () => string,
): Promise<ExecuteResult> {
  return new Promise<ExecuteResult>((resolve, reject) => {
    const onStreamError = (e: unknown) => {
      const err = e instanceof Error ? e : new Error(String(e));
      reject(err);
    };

    stream.on('end', async () => {
      try {
        stdoutStream.end();
        stderrStream.end();
        const info = await exec.inspect();
        resolve({
          exitCode: info.ExitCode ?? 0,
          output: getOutput(),
        });
      } catch (error) {
        reject(error);
      }
    });

    stream.on('error', onStreamError);
    stdoutStream.on('error', onStreamError);
    stderrStream.on('error', onStreamError);
  });
}

export async function execute({
  container,
  command,
  env,
}: ExecuteOptions): Promise<ExecutionHandle> {
  // 1. 创建 exec
  const exec = await container.exec({
    Cmd: ['sh', '-lc', command],
    AttachStdout: true,
    AttachStderr: true,
    Env: env,
    Tty: false,
  });

  // 2. 启动并获取流
  const stream = await exec.start({ hijack: true, stdin: false });
  let output = '';

  // 3. 创建 PassThrough 流
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();

  stdoutStream.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  stderrStream.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });

  // 4. 使用类型工具访问 modem.demuxStream
  const typedContainer = container as ContainerWithModem;
  const demux = typedContainer.modem.demuxStream;

  if (demux) {
    demux(stream, stdoutStream, stderrStream);
  } else {
    stream.pipe(stdoutStream);
  }

  // 5. 返回 ExecutionHandle
  return {
    stream: stdoutStream,
    wait: () => createWaitPromise(stream, stdoutStream, stderrStream, exec, () => output),
  };
}

export async function executeStep({
  container,
  name,
  script,
  env,
}: ExecuteStepOptions): Promise<StepResult> {
  const stepStartTime = Date.now();
  try {
    const execution = await execute({
      container,
      command: script,
      env,
    });

    const result = await execution.wait();
    const duration = Date.now() - stepStartTime;

    return {
      success: result.exitCode === 0,
      duration,
      output: result.output,
    };
  } catch (error) {
    const duration = Date.now() - stepStartTime;
    if (error instanceof Error) {
      throw new StepExecutionError(`步骤 ${name} 执行异常: ${error.message}`, duration);
    }
    throw new StepExecutionError(`步骤 ${name} 执行异常: ${String(error)}`, duration);
  }
}
