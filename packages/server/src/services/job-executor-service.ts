import type Docker from 'dockerode';
import type { WorkflowConfig } from '@xbghc/gitcode-actions';
import { dockerNodeService, type DockerNode } from './docker-node-service.js';
import { containerService } from './container-service.js';
import { logger } from '../utils/logger.js';

/**
 * 任务执行上下文
 */
export interface JobContext {
  workflowId: string;
  repoUrl: string;
  branch: string;
  config: WorkflowConfig;
  gitcodeToken?: string;
}

/**
 * 步骤更新回调
 */
export interface StepCallback {
  onStepStart: (stepName: string) => void;
  onStepOutput: (stepName: string, output: string) => void;
  onStepSuccess: (stepName: string) => void;
  onStepFailed: (stepName: string, error: string) => void;
}

/**
 * 任务执行服务
 * 在 server 端直接执行 workflow 任务
 */
export class JobExecutorService {
  /**
   * 执行 workflow 任务
   */
  async execute(context: JobContext, callbacks: StepCallback): Promise<void> {
    const { workflowId, repoUrl, branch, config, gitcodeToken } = context;
    const {
      steps: configSteps,
      env: globalEnv,
      timeout: globalTimeout,
      baseImage,
      beforeAll,
      afterAll,
    } = config;

    // 获取可用的 Docker 节点
    const node = dockerNodeService.getAvailableNode();
    if (!node) {
      throw new Error('没有可用的 Docker 节点，请先注册 Docker 节点');
    }

    logger.info({ workflowId, nodeId: node.id, nodeName: node.name }, 'Executing job on node');
    dockerNodeService.incrementActiveJobs(node.id);

    let container: Docker.Container | undefined;

    try {
      // 准备环境变量
      const containerEnv: Record<string, string> = {
        GITCODE_TOKEN: gitcodeToken || '',
      };
      if (globalEnv) {
        Object.assign(containerEnv, globalEnv);
      }

      // 1. 准备容器
      callbacks.onStepStart('fetch-pr');
      container = await this.prepareContainer(node, workflowId, baseImage, containerEnv, callbacks);
      callbacks.onStepSuccess('fetch-pr');

      // 2. BeforeAll (克隆代码)
      callbacks.onStepStart('beforeAll');
      const beforeAllCommand = beforeAll || this.buildInitCommand(repoUrl, branch);
      await this.executeStepCommand(container, 'beforeAll', beforeAllCommand, {
        timeout: globalTimeout,
        callbacks,
      });
      callbacks.onStepSuccess('beforeAll');

      // 3. 用户步骤
      for (const step of configSteps) {
        callbacks.onStepStart(step.name);

        const stepEnv = { ...containerEnv, ...step.env };
        const cmd = step.commands.join(' && ');

        try {
          await this.executeStepCommand(container, step.name, cmd, {
            workDir: '/workspace',
            env: stepEnv,
            timeout: step.timeout || globalTimeout,
            callbacks,
          });
          callbacks.onStepSuccess(step.name);
        } catch (error) {
          if (step.continueOnError) {
            callbacks.onStepOutput(
              step.name,
              `Step failed but continueOnError is true, continuing...\n`,
            );
            callbacks.onStepSuccess(step.name);
          } else {
            throw error;
          }
        }
      }

      // 4. AfterAll
      if (afterAll) {
        callbacks.onStepStart('afterAll');
        await this.executeStepCommand(container, 'afterAll', afterAll, {
          workDir: '/workspace',
          timeout: globalTimeout,
          callbacks,
        });
        callbacks.onStepSuccess('afterAll');
      }
    } finally {
      // 清理容器
      if (container) {
        await containerService.removeContainer(container);
      }
      dockerNodeService.decrementActiveJobs(node.id);
    }
  }

  /**
   * 准备容器
   */
  private async prepareContainer(
    node: DockerNode,
    workflowId: string,
    baseImage: string | undefined,
    env: Record<string, string>,
    callbacks: StepCallback,
  ): Promise<Docker.Container> {
    callbacks.onStepOutput('fetch-pr', 'Initializing runner...\n');

    const image = baseImage || 'node:22';
    callbacks.onStepOutput('fetch-pr', `Checking image ${image}...\n`);

    const container = await containerService.createContainer({
      docker: node.client,
      image,
      env,
      labels: {
        'gitcode.workflowId': workflowId,
      },
    });

    callbacks.onStepOutput('fetch-pr', 'Container ready.\n');
    return container;
  }

  /**
   * 执行步骤命令
   */
  private async executeStepCommand(
    container: Docker.Container,
    stepName: string,
    command: string,
    options: {
      workDir?: string;
      env?: Record<string, string>;
      timeout?: number;
      callbacks: StepCallback;
    },
  ): Promise<void> {
    const { workDir, env, timeout, callbacks } = options;

    const result = await containerService.exec(container, command, {
      workDir,
      env,
      timeout: timeout ? timeout * 1000 : undefined, // 转换为毫秒
      onOutput: (data) => {
        callbacks.onStepOutput(stepName, data);
      },
    });

    if (result.exitCode !== 0) {
      callbacks.onStepFailed(stepName, `Exit code: ${result.exitCode}`);
      throw new Error(`Step ${stepName} failed with exit code ${result.exitCode}`);
    }
  }

  /**
   * 构建初始化命令（克隆仓库）
   */
  private buildInitCommand(repoUrl: string, branch: string): string {
    return `git clone --depth 1 --branch ${branch} ${repoUrl} /workspace`;
  }
}

// 导出单例
export const jobExecutorService = new JobExecutorService();
