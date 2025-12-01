import type Docker from 'dockerode';
import { PassThrough } from 'node:stream';
import { logger } from '../utils/logger.js';

/**
 * 命令执行选项
 */
export interface ExecOptions {
  /** 工作目录 */
  workDir?: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 实时输出回调 */
  onOutput?: (data: string) => void;
}

/**
 * 命令执行结果
 */
export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * 创建容器选项
 */
export interface CreateContainerOptions {
  /** Docker 客户端 */
  docker: Docker;
  /** 镜像名 */
  image: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 容器标签 */
  labels?: Record<string, string>;
}

/**
 * 容器服务
 * 封装 Docker 容器操作
 */
export class ContainerService {
  /**
   * 确保镜像存在，不存在则拉取
   */
  async ensureImage(docker: Docker, image: string): Promise<void> {
    try {
      const imageObj = docker.getImage(image);
      await imageObj.inspect();
      logger.debug({ image }, 'Image already exists');
    } catch {
      logger.info({ image }, 'Pulling image...');
      await new Promise<void>((resolve, reject) => {
        docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            reject(err);
            return;
          }
          docker.modem.followProgress(
            stream,
            (err: Error | null) => {
              if (err) reject(err);
              else resolve();
            },
            () => {
              // onProgress - 可以在这里输出进度
            },
          );
        });
      });
      logger.info({ image }, 'Image pulled successfully');
    }
  }

  /**
   * 创建并启动容器
   */
  async createContainer(options: CreateContainerOptions): Promise<Docker.Container> {
    const { docker, image, env = {}, labels = {} } = options;

    // 确保镜像存在
    await this.ensureImage(docker, image);

    // 构建环境变量数组
    const envList = Object.entries(env).map(([k, v]) => `${k}=${v}`);

    // 创建容器
    const container = await docker.createContainer({
      Image: image,
      Cmd: ['sh', '-lc', 'tail -f /dev/null'],
      Env: envList,
      User: 'node',
      WorkingDir: '/workspace',
      HostConfig: { AutoRemove: false },
      Labels: {
        'gitcode.managed': 'true',
        ...labels,
      },
    });

    await container.start();
    logger.debug({ containerId: container.id }, 'Container created and started');

    return container;
  }

  /**
   * 在容器中执行命令
   */
  async exec(
    container: Docker.Container,
    command: string,
    options: ExecOptions = {},
  ): Promise<ExecResult> {
    const { workDir, env, timeout, onOutput } = options;

    // 构建环境变量数组
    const envList: string[] = [];
    if (env) {
      for (const [key, value] of Object.entries(env)) {
        envList.push(`${key}=${value}`);
      }
    }

    // 如果指定了工作目录，使用 cd
    const fullCommand = workDir ? `cd ${workDir} && ${command}` : command;

    // 创建 exec
    const exec = await container.exec({
      Cmd: ['sh', '-lc', fullCommand],
      AttachStdout: true,
      AttachStderr: true,
      Env: envList.length > 0 ? envList : undefined,
      Tty: false,
    });

    // 启动 exec
    const stream = await exec.start({ hijack: true, stdin: false });
    let output = '';

    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();

    stdoutStream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      if (onOutput) {
        onOutput(text);
      }
    });

    stderrStream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      if (onOutput) {
        onOutput(text);
      }
    });

    // Demux stream
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modem = (container as any).modem;
    if (modem?.demuxStream) {
      modem.demuxStream(stream, stdoutStream, stderrStream);
    } else {
      stream.pipe(stdoutStream);
    }

    // 创建等待 Promise
    const waitPromise = new Promise<ExecResult>((resolve, reject) => {
      stream.on('end', async () => {
        try {
          stdoutStream.end();
          stderrStream.end();
          const info = await exec.inspect();
          resolve({
            exitCode: info.ExitCode ?? 0,
            stdout: output,
            stderr: '',
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });

    // 应用超时
    if (timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Command timeout after ${timeout}ms`));
        }, timeout);
      });
      return Promise.race([waitPromise, timeoutPromise]);
    }

    return waitPromise;
  }

  /**
   * 停止容器
   */
  async stopContainer(container: Docker.Container, timeoutSeconds = 10): Promise<void> {
    try {
      const info = await container.inspect();
      if (info.State.Running) {
        await container.stop({ t: timeoutSeconds });
      }
    } catch (error) {
      logger.warn({ containerId: container.id, error }, 'Failed to stop container');
    }
  }

  /**
   * 删除容器
   */
  async removeContainer(container: Docker.Container, force = true): Promise<void> {
    try {
      await container.remove({ force });
      logger.debug({ containerId: container.id }, 'Container removed');
    } catch (error) {
      logger.warn({ containerId: container.id, error }, 'Failed to remove container');
    }
  }

  /**
   * 清理所有 GitCode 管理的容器
   */
  async cleanupManagedContainers(docker: Docker): Promise<number> {
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: ['gitcode.managed=true'],
      },
    });

    let removed = 0;
    for (const containerInfo of containers) {
      try {
        const container = docker.getContainer(containerInfo.Id);
        await container.remove({ force: true });
        removed++;
      } catch (error) {
        logger.warn({ containerId: containerInfo.Id, error }, 'Failed to cleanup container');
      }
    }

    return removed;
  }
}

// 导出单例
export const containerService = new ContainerService();
