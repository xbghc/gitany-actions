import type Docker from 'dockerode';
import { PassThrough } from 'node:stream';
import type { ContainerWithModem } from '../container/docker-types.js';

/**
 * 容器命令执行的底层实现
 *
 * 这个文件提供了 ContainerExecutor 使用的底层 Docker 命令执行功能。
 * 对于大多数用例，应该使用 ContainerExecutor 类而不是直接使用这些函数。
 */

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

export async function execCommand({
  container,
  command,
  env,
}: ExecuteOptions): Promise<ExecutionHandle> {
  const exec = await container.exec({
    Cmd: ['sh', '-lc', command],
    AttachStdout: true,
    AttachStderr: true,
    Env: env,
    Tty: false,
  });

  const stream = await exec.start({ hijack: true, stdin: false });
  let output = '';

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

  return {
    stream: stdoutStream,
    wait: () => createWaitPromise(stream, stdoutStream, stderrStream, exec, () => output),
  };
}
