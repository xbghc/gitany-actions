import type Docker from 'dockerode';
import type { Logger } from '@gitany/shared';

export interface ExecuteStepOptions {
  container: Docker.Container;
  name: string;
  script: string;
  log: Logger;
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
  verbose = false,
}: ExecuteStepOptions): Promise<StepResult> {
  const stepStartTime = Date.now();
  try {
    const exec = await container.exec({
      Cmd: ['sh', '-lc', script],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    let stepOutput = '';

    stream.on('data', (data) => {
      const text = data.toString();
      stepOutput += text;
      if (verbose) {
        try {
          log.debug(`[${name}] ${text}`);
        } catch {
          /* ignore */
        }
      }
    });

    return await new Promise<StepResult>((resolve, reject) => {
      stream.on('end', async () => {
        const info = await exec.inspect();
        const duration = Date.now() - stepStartTime;
        const success = info.ExitCode === 0;
        resolve({ success, duration, output: stepOutput });
      });
      stream.on('error', (e) => {
        const err = e instanceof Error ? e : new Error(String(e));
        err.name = 'StepStreamError';
        reject(err);
      });
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

