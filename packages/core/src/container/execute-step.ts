import type Docker from 'dockerode';
import type { Logger } from '@gitany/shared';
import { PassThrough } from 'node:stream';

export interface ExecuteStepOptions {
  container: Docker.Container;
  name: string;
  script: string;
  log: Logger;
  /** Environment variables to provide to the command. */
  env?: string[];
  verbose?: boolean;
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

export async function executeStep({
  container,
  name,
  script,
  log,
  env,
  verbose = false,
}: ExecuteStepOptions): Promise<StepResult> {
  const stepStartTime = Date.now();
  try {
    const exec = await container.exec({
      Cmd: ['sh', '-lc', script],
      AttachStdout: true,
      AttachStderr: true,
      Env: env,
      Tty: false,
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    let stepOutput = '';

    const appendOutput = (source: 'stdout' | 'stderr', chunk: Buffer) => {
      if (!chunk?.length) return;
      const text = chunk.toString();
      stepOutput += text;
      if (!verbose) return;
      try {
        const scope = source === 'stderr' ? `${name}:stderr` : name;
        log.debug(`[${scope}] ${text}`);
      } catch {
        /* ignore */
      }
    };

    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    stdoutStream.on('data', (chunk: Buffer) => appendOutput('stdout', chunk));
    stderrStream.on('data', (chunk: Buffer) => appendOutput('stderr', chunk));

    return await new Promise<StepResult>((resolve, reject) => {
      const onStreamError = (e: unknown) => {
        const err = e instanceof Error ? e : new Error(String(e));
        err.name = 'StepStreamError';
        reject(err);
      };

      stream.on('end', async () => {
        stdoutStream.end();
        stderrStream.end();
        const info = await exec.inspect();
        const duration = Date.now() - stepStartTime;
        const success = info.ExitCode === 0;
        resolve({ success, duration, output: stepOutput });
      });
      stream.on('error', onStreamError);
      stdoutStream.on('error', onStreamError);
      stderrStream.on('error', onStreamError);

      const withModem = container as Docker.Container & {
        modem?: {
          demuxStream?: (
            stream: NodeJS.ReadableStream,
            stdout: NodeJS.WritableStream,
            stderr: NodeJS.WritableStream,
          ) => void;
        };
      };
      const demux = withModem.modem?.demuxStream;
      if (demux) {
        demux(stream, stdoutStream, stderrStream);
      } else {
        stream.pipe(stdoutStream);
      }
    });
  } catch (error) {
    const duration = Date.now() - stepStartTime;
    if (error instanceof Error) {
      const context = error.name === 'StepStreamError' ? '流错误' : '执行异常';
      throw new StepExecutionError(`步骤 ${name} ${context}: ${error.message}`, duration);
    }
    throw new StepExecutionError(
      `步骤 ${name} 执行异常: ${String(error)}`,
      duration,
    );
  }
}
