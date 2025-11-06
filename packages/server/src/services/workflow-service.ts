import { exec } from '@xbghc/gitcode-actions';
import type { GitCodeClient } from '@xbghc/gitcode-api';
import { EventEmitter } from 'events';
import type { WorkflowConfig } from '../types/workflow-config.js';
import type {
  SSECompleteMessage,
  SSEErrorMessage,
  SSEOutputMessage,
  SSEStepMessage,
  WorkflowResult,
  WorkflowStatus,
} from '../types/workflow.js';
import {
  buildInitCommand,
  checkDockerAvailable,
  checkImageExists,
  createAndStartContainer,
  pullDockerImage,
  removeContainer,
} from '../utils/docker-runner.js';

/**
 * Workflow服务
 * 负责管理和执行PR的build和lint测试
 */
export class WorkflowService {
  // 使用Map存储workflow结果（生产环境可替换为Redis）
  private workflows = new Map<string, WorkflowResult>();

  // EventEmitter用于SSE事件推送
  private eventEmitters = new Map<string, EventEmitter>();

  /**
   * 生成workflowId
   */
  private generateWorkflowId(owner: string, repo: string, prNumber: number): string {
    const timestamp = Date.now();
    return `${owner}-${repo}-${prNumber}-${timestamp}`;
  }

  /**
   * 获取或创建EventEmitter
   */
  private getEventEmitter(workflowId: string): EventEmitter {
    let emitter = this.eventEmitters.get(workflowId);
    if (!emitter) {
      emitter = new EventEmitter();
      this.eventEmitters.set(workflowId, emitter);
    }
    return emitter;
  }

  /**
   * 发送步骤变更事件
   */
  private emitStep(workflowId: string, name: string, status: WorkflowStatus) {
    const emitter = this.getEventEmitter(workflowId);
    const message: SSEStepMessage = {
      type: 'step',
      data: { name, status },
    };
    emitter.emit('message', message);
  }

  /**
   * 发送输出事件
   */
  private emitOutput(workflowId: string, step: string, text: string) {
    const emitter = this.getEventEmitter(workflowId);
    const message: SSEOutputMessage = {
      type: 'output',
      data: { step, text },
    };
    emitter.emit('message', message);
  }

  /**
   * 发送错误事件
   */
  private emitError(workflowId: string, step: string, errorMessage: string) {
    const emitter = this.getEventEmitter(workflowId);
    const message: SSEErrorMessage = {
      type: 'error',
      data: { step, message: errorMessage },
    };
    emitter.emit('message', message);
  }

  /**
   * 处理Docker基础设施错误
   * - 向前端发送用户友好的消息
   * - 在服务器日志记录完整的技术错误
   */
  private emitDockerInfraError(
    workflowId: string,
    step: string,
    technicalError: string,
    userMessage: string = '测试服务暂时不可用，请稍后重试或联系管理员',
  ) {
    // 服务器日志记录完整错误
    console.error(`[Workflow ${workflowId}] Docker infrastructure error in step ${step}:`);
    console.error(technicalError);

    // 前端只看到用户友好消息
    this.emitError(workflowId, step, userMessage);
    this.updateStep(workflowId, step, 'failed', userMessage);
  }

  /**
   * 发送完成事件
   */
  private emitComplete(workflowId: string, status: WorkflowStatus) {
    const emitter = this.getEventEmitter(workflowId);
    const message: SSECompleteMessage = {
      type: 'complete',
      data: { workflowId, status },
    };
    emitter.emit('message', message);
    emitter.emit('done'); // 通知SSE连接可以关闭
  }

  /**
   * 更新workflow步骤
   */
  private updateStep(
    workflowId: string,
    stepName: string,
    status: WorkflowStatus,
    output?: string,
  ) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const step = workflow.steps.find((s) => s.name === stepName);
    if (step) {
      step.status = status;
      if (output !== undefined) {
        step.output = (step.output || '') + output;
      }
      if (status === 'running' && !step.startTime) {
        step.startTime = new Date().toISOString();
      }
      if ((status === 'success' || status === 'failed') && !step.endTime) {
        step.endTime = new Date().toISOString();
      }
    }

    // 发送步骤变更事件
    this.emitStep(workflowId, stepName, status);
  }

  /**
   * 执行配置驱动的 PR Workflow
   * @param owner 仓库所有者
   * @param repo 仓库名
   * @param prNumber PR编号
   * @param config 完整的 Workflow 配置
   * @param gitcodeClient GitCode客户端（用于获取PR信息）
   * @returns workflowId
   */
  async executeConfigDrivenWorkflow(
    owner: string,
    repo: string,
    prNumber: number,
    config: WorkflowConfig,
    gitcodeClient: GitCodeClient,
  ): Promise<string> {
    const workflowId = this.generateWorkflowId(owner, repo, prNumber);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    // 根据配置动态生成步骤列表
    const steps = [
      { name: 'fetch-pr', status: 'pending' as WorkflowStatus },
      { name: 'beforeAll', status: 'pending' as WorkflowStatus },
      ...config.steps.map((step) => ({
        name: step.name,
        status: 'pending' as WorkflowStatus,
      })),
    ];

    if (config.afterAll) {
      steps.push({ name: 'afterAll', status: 'pending' as WorkflowStatus });
    }

    // 初始化workflow
    const workflow: WorkflowResult = {
      workflowId,
      owner,
      repo,
      repoUrl,
      prNumber,
      configId: config.id,
      configName: config.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
      steps,
    };

    this.workflows.set(workflowId, workflow);

    // 异步执行workflow
    this.runConfigDrivenWorkflow(
      workflowId,
      owner,
      repo,
      prNumber,
      repoUrl,
      config,
      gitcodeClient,
    ).catch((error) => {
      console.error(`Workflow ${workflowId} failed:`, error);
      workflow.status = 'failed';
      workflow.error = error.message;
      workflow.completedAt = new Date().toISOString();
      this.emitError(workflowId, 'workflow', error.message);
      this.emitComplete(workflowId, 'failed');
    });

    return workflowId;
  }

  /**
   * 配置驱动的 Workflow 执行（私有方法）
   */
  private async runConfigDrivenWorkflow(
    workflowId: string,
    owner: string,
    repo: string,
    prNumber: number,
    repoUrl: string,
    config: WorkflowConfig,
    gitcodeClient: GitCodeClient,
  ) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    workflow.status = 'running';
    const containerName = `workflow-${workflowId}`;
    let sourceBranch = '';

    try {
      // ========== 步骤 1: 获取 PR 信息 ==========
      this.updateStep(workflowId, 'fetch-pr', 'running');
      this.emitOutput(workflowId, 'fetch-pr', `正在获取 PR #${prNumber} 信息...\n`);

      const pulls = await gitcodeClient.pr.list(repoUrl, { state: 'all', per_page: 100 });
      const pr = pulls.find((p) => p.number === prNumber);

      if (!pr) {
        throw new Error(`PR #${prNumber} not found`);
      }

      sourceBranch = pr.head.ref;
      this.emitOutput(workflowId, 'fetch-pr', `找到 PR 分支: ${sourceBranch}\n`);

      if (pr.state !== 'open') {
        const errorMsg =
          `PR #${prNumber} 状态为 "${pr.state}"，无法执行测试\n` +
          `仅支持对打开状态（open）的 PR 进行测试。`;
        throw new Error(errorMsg);
      }

      // 验证分支存在
      try {
        await gitcodeClient.repo.getBranch(owner, repo, sourceBranch);
        this.emitOutput(workflowId, 'fetch-pr', `✓ 分支验证成功: ${sourceBranch}\n`);
      } catch {
        throw new Error(`分支验证失败: ${sourceBranch}`);
      }

      // 检查 Docker 环境
      this.emitOutput(workflowId, 'fetch-pr', '正在检查 Docker 环境...\n');
      const dockerCheck = await checkDockerAvailable();
      if (!dockerCheck.available) {
        throw new Error('Docker 环境不可用');
      }

      const baseImage = config.baseImage || 'node:22';
      const registryMirror = config.registryMirror || 'docker.m.daocloud.io';

      // 检查并拉取镜像
      this.emitOutput(workflowId, 'fetch-pr', `正在检查镜像 ${baseImage}...\n`);
      const imageExists = await checkImageExists(baseImage);

      if (!imageExists) {
        this.emitOutput(workflowId, 'fetch-pr', `⚠️  镜像不存在，开始拉取...\n`);
        const pullResult = await pullDockerImage(baseImage, registryMirror, (text) => {
          this.emitOutput(workflowId, 'fetch-pr', text);
        });
        if (!pullResult.success) {
          throw new Error('镜像拉取失败');
        }
      }

      // 创建容器
      this.emitOutput(workflowId, 'fetch-pr', `正在创建容器 ${containerName}...\n`);
      const createResult = await createAndStartContainer(containerName, baseImage, {
        GITCODE_TOKEN: process.env.GITCODE_TOKEN || '',
        ...config.env,
      });

      if (!createResult.success) {
        throw new Error('容器创建失败');
      }

      this.updateStep(workflowId, 'fetch-pr', 'success');

      // ========== 步骤 2: 执行 beforeAll 钩子 ==========
      this.updateStep(workflowId, 'beforeAll', 'running');
      this.emitOutput(workflowId, 'beforeAll', '正在执行前置钩子...\n');

      const beforeAllCommand = config.beforeAll || buildInitCommand(repoUrl, sourceBranch);
      const beforeAllResult = await exec(containerName, beforeAllCommand, {
        timeout: config.timeout,
        onOutput: (data) => {
          this.emitOutput(workflowId, 'beforeAll', data);
        },
        // beforeAll 在容器根目录执行，负责创建 /workspace，所以不传 workDir
      });

      if (beforeAllResult.exitCode !== 0) {
        throw new Error(
          `beforeAll 执行失败，退出码: ${beforeAllResult.exitCode}\n${beforeAllResult.stdout}`,
        );
      }

      this.updateStep(workflowId, 'beforeAll', 'success');

      // ========== 步骤 3: 执行用户定义的 steps ==========
      for (const step of config.steps) {
        await this.executeStep(workflowId, containerName, step, config);
      }

      // ========== 步骤 4: 执行 afterAll 钩子 ==========
      if (config.afterAll) {
        this.updateStep(workflowId, 'afterAll', 'running');
        this.emitOutput(workflowId, 'afterAll', '正在执行后置钩子...\n');

        const afterAllResult = await exec(containerName, config.afterAll, {
          workDir: '/workspace',
          timeout: config.timeout,
          onOutput: (data) => {
            this.emitOutput(workflowId, 'afterAll', data);
          },
        });

        if (afterAllResult.exitCode !== 0) {
          throw new Error(
            `afterAll 执行失败，退出码: ${afterAllResult.exitCode}\n${afterAllResult.stdout}`,
          );
        }

        this.updateStep(workflowId, 'afterAll', 'success');
      }

      // 所有步骤完成
      workflow.status = 'success';
      workflow.completedAt = new Date().toISOString();
      this.emitComplete(workflowId, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // 添加服务器日志，方便调试
      console.error(`[Workflow ${workflowId}] Execution failed:`, error);

      workflow.status = 'failed';
      workflow.error = errorMessage;
      workflow.completedAt = new Date().toISOString();

      const runningStep = workflow.steps.find((s) => s.status === 'running');
      if (runningStep) {
        // 关键修复：先发送错误消息到前端
        this.emitError(workflowId, runningStep.name, errorMessage);
        // 再更新步骤状态
        this.updateStep(workflowId, runningStep.name, 'failed', errorMessage);
      } else {
        // 如果没有运行中的步骤，说明是初始化阶段失败
        this.emitError(workflowId, 'workflow', errorMessage);
      }

      this.emitComplete(workflowId, 'failed');
    } finally {
      // 清理容器
      try {
        await removeContainer(containerName);
        console.log(`[Workflow ${workflowId}] Container ${containerName} removed`);
      } catch (error) {
        console.error(`[Workflow ${workflowId}] Failed to remove container:`, error);
      }
    }
  }

  /**
   * 执行单个步骤（支持 retry、continueOnError、env、workDir、timeout）
   */
  private async executeStep(
    workflowId: string,
    containerName: string,
    step: WorkflowConfig['steps'][0],
    globalConfig: WorkflowConfig,
  ) {
    this.updateStep(workflowId, step.name, 'running');
    this.emitOutput(workflowId, step.name, `开始执行步骤: ${step.name}\n`);

    const retryCount = step.retry || 0;
    const stepTimeout = step.timeout || globalConfig.timeout;
    const workDir = step.workDir || '/workspace';

    // 合并环境变量
    const env = { ...globalConfig.env, ...step.env };
    const envPrefix = Object.entries(env)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    // 构建命令：cd 到工作目录 + 设置环境变量 + 执行命令
    const fullCommand = step.commands
      .map((cmd) => {
        const parts = [];
        if (workDir) {
          parts.push(`cd ${workDir}`);
        }
        if (envPrefix) {
          parts.push(`export ${envPrefix}`);
        }
        parts.push(cmd);
        return parts.join(' && ');
      })
      .join(' && ');

    let lastError = '';
    let attempt = 0;

    // 重试逻辑
    while (attempt <= retryCount) {
      if (attempt > 0) {
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        this.emitOutput(
          workflowId,
          step.name,
          `重试 ${attempt}/${retryCount}，等待 ${waitTime}ms...\n`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      const result = await exec(containerName, fullCommand, {
        workDir,
        timeout: stepTimeout,
        onOutput: (data) => {
          this.emitOutput(workflowId, step.name, data);
        },
      });

      if (result.exitCode === 0) {
        this.updateStep(workflowId, step.name, 'success');
        this.emitOutput(workflowId, step.name, `✓ 步骤完成\n`);
        return;
      }

      lastError = `退出码: ${result.exitCode}\n${result.stdout}`;
      attempt++;
    }

    // 所有重试失败
    if (step.continueOnError) {
      this.updateStep(workflowId, step.name, 'failed', lastError);
      this.emitOutput(workflowId, step.name, `⚠️  步骤失败但继续执行: ${lastError}\n`);
    } else {
      this.updateStep(workflowId, step.name, 'failed', lastError);
      throw new Error(`步骤 "${step.name}" 失败: ${lastError}`);
    }
  }

  /**
   * 获取workflow状态
   * @param workflowId workflow ID
   * @returns workflow结果，如果不存在返回null
   */
  getWorkflowStatus(workflowId: string): WorkflowResult | null {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * 订阅workflow事件（用于SSE）
   * @param workflowId workflow ID
   * @param callback 事件回调
   * @returns 取消订阅函数
   */
  subscribeToWorkflow(
    workflowId: string,
    callback: (
      message: SSEStepMessage | SSEOutputMessage | SSEErrorMessage | SSECompleteMessage,
    ) => void,
  ): () => void {
    const emitter = this.getEventEmitter(workflowId);

    const messageHandler = (
      message: SSEStepMessage | SSEOutputMessage | SSEErrorMessage | SSECompleteMessage,
    ) => {
      callback(message);
    };

    emitter.on('message', messageHandler);

    // 返回取消订阅函数
    return () => {
      emitter.off('message', messageHandler);
      // 如果没有监听器了，清理EventEmitter
      if (emitter.listenerCount('message') === 0) {
        this.eventEmitters.delete(workflowId);
      }
    };
  }

  /**
   * 等待workflow完成
   * @param workflowId workflow ID
   * @param timeout 超时时间（毫秒）
   */
  async waitForWorkflowComplete(workflowId: string, timeout = 60000): Promise<void> {
    const emitter = this.getEventEmitter(workflowId);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Workflow wait timeout'));
      }, timeout);

      const doneHandler = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        clearTimeout(timer);
        emitter.off('done', doneHandler);
      };

      emitter.once('done', doneHandler);
    });
  }

  /**
   * 列出指定仓库的所有 workflow
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @returns workflow 列表（按时间倒序）
   */
  listByRepo(owner: string, repo: string): WorkflowResult[] {
    const results: WorkflowResult[] = [];

    for (const workflow of this.workflows.values()) {
      if (workflow.owner === owner && workflow.repo === repo) {
        results.push(workflow);
      }
    }

    // 按时间倒序排列
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * 清理过期的workflow记录
   * @param maxAge 最大保留时间（毫秒），默认1小时
   */
  cleanupOldWorkflows(maxAge = 60 * 60 * 1000) {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [workflowId, workflow] of this.workflows.entries()) {
      const createdAt = new Date(workflow.createdAt).getTime();
      if (now - createdAt > maxAge) {
        toDelete.push(workflowId);
      }
    }

    for (const workflowId of toDelete) {
      this.workflows.delete(workflowId);
      this.eventEmitters.delete(workflowId);
    }

    return toDelete.length;
  }
}

// 导出单例
export const workflowService = new WorkflowService();
