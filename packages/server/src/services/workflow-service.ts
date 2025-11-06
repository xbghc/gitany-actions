import type { GitCodeClient } from '@xbghc/gitcode-api';
import { EventEmitter } from 'events';
import type {
  SSECompleteMessage,
  SSEErrorMessage,
  SSEOutputMessage,
  SSEStepMessage,
  WorkflowConfig,
  WorkflowResult,
  WorkflowStatus,
} from '../types/workflow.js';
import {
  buildBuildCommand,
  buildInitCommand,
  buildLintCommand,
  checkDockerAvailable,
  checkImageExists,
  createAndStartContainer,
  execInContainer,
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
   * 执行PR测试工作流
   * @param owner 仓库所有者
   * @param repo 仓库名
   * @param prNumber PR编号
   * @param config 配置选项
   * @param gitcodeClient GitCode客户端（用于获取PR信息）
   * @returns workflowId
   */
  async executePrWorkflow(
    owner: string,
    repo: string,
    prNumber: number,
    config: WorkflowConfig,
    gitcodeClient: GitCodeClient,
  ): Promise<string> {
    const workflowId = this.generateWorkflowId(owner, repo, prNumber);
    const repoUrl = `https://gitcode.com/${owner}/${repo}`;

    // 初始化workflow
    const workflow: WorkflowResult = {
      workflowId,
      owner,
      repo,
      repoUrl,
      prNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
      steps: [
        { name: 'fetch-pr', status: 'pending' },
        { name: 'docker-init', status: 'pending' },
        { name: 'docker-build', status: 'pending' },
        { name: 'docker-lint', status: 'pending' },
      ],
    };

    this.workflows.set(workflowId, workflow);

    // 异步执行测试
    this.runWorkflow(workflowId, owner, repo, prNumber, repoUrl, config, gitcodeClient).catch(
      (error) => {
        console.error(`Workflow ${workflowId} failed:`, error);
        workflow.status = 'failed';
        workflow.error = error.message;
        workflow.completedAt = new Date().toISOString();
        this.emitError(workflowId, 'workflow', error.message);
        this.emitComplete(workflowId, 'failed');
      },
    );

    return workflowId;
  }

  /**
   * 实际执行workflow（私有方法）
   */
  private async runWorkflow(
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

    // 生成容器名称
    const containerName = `workflow-${workflowId}`;

    try {
      // 步骤1: 获取PR信息
      this.updateStep(workflowId, 'fetch-pr', 'running');
      this.emitOutput(workflowId, 'fetch-pr', `正在获取 PR #${prNumber} 信息...\n`);

      const pulls = await gitcodeClient.pr.list(repoUrl, {
        state: 'all',
        per_page: 100,
      });

      const pr = pulls.find((p) => p.number === prNumber);
      if (!pr) {
        throw new Error(`PR #${prNumber} not found`);
      }

      const sourceBranch = pr.head.ref;
      this.emitOutput(workflowId, 'fetch-pr', `找到PR分支: ${sourceBranch}\n`);

      // 检查 PR 状态
      if (pr.state !== 'open') {
        const errorMsg =
          `PR #${prNumber} 状态为 "${pr.state}"，无法执行测试\n\n` +
          `仅支持对打开状态（open）的 PR 进行测试。\n\n` +
          `当前状态：${pr.state}\n` +
          `建议：请重新打开 PR 后再试`;

        this.emitError(workflowId, 'fetch-pr', errorMsg);
        this.updateStep(workflowId, 'fetch-pr', 'failed', errorMsg);
        throw new Error(errorMsg);
      }

      this.emitOutput(workflowId, 'fetch-pr', `✓ PR 状态检查通过：${pr.state}\n`);
      this.updateStep(workflowId, 'fetch-pr', 'success');

      // 步骤1.5: 验证源分支是否存在
      this.emitStep(workflowId, 'verify-branch', 'running');
      this.emitOutput(workflowId, 'verify-branch', `正在验证分支存在性...\n`);

      // 输出调试信息
      this.emitOutput(workflowId, 'verify-branch', `[调试] 仓库: ${owner}/${repo}\n`);
      this.emitOutput(workflowId, 'verify-branch', `[调试] 分支名: ${sourceBranch}\n`);
      this.emitOutput(workflowId, 'verify-branch', `[调试] PR head.label: ${pr.head.label}\n`);
      this.emitOutput(workflowId, 'verify-branch', `[调试] PR head.ref: ${pr.head.ref}\n`);

      try {
        // 使用GitCode API检查分支
        await gitcodeClient.repo.getBranch(owner, repo, sourceBranch);
        this.emitOutput(workflowId, 'verify-branch', `✓ 分支验证成功: ${sourceBranch}\n`);
        this.updateStep(workflowId, 'verify-branch', 'success');
      } catch (error) {
        // 输出详细错误信息
        const errorWithResponse = error as unknown as {
          response?: { status?: number; statusText?: string; data?: unknown };
        };
        console.error('[Branch Verification Failed]', {
          workflowId,
          owner,
          repo,
          sourceBranch,
          errorType: error?.constructor?.name,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          // 如果有 HTTP 响应信息也输出
          httpStatus: errorWithResponse?.response?.status,
          httpStatusText: errorWithResponse?.response?.statusText,
          httpData: errorWithResponse?.response?.data,
        });

        this.emitOutput(
          workflowId,
          'verify-branch',
          `[调试] 错误类型: ${error?.constructor?.name}\n`,
        );
        this.emitOutput(
          workflowId,
          'verify-branch',
          `[调试] 错误消息: ${error instanceof Error ? error.message : String(error)}\n`,
        );

        if (errorWithResponse?.response?.status) {
          this.emitOutput(
            workflowId,
            'verify-branch',
            `[调试] HTTP 状态码: ${errorWithResponse.response.status}\n`,
          );
        }

        const errorMsg =
          `分支验证失败: ${sourceBranch}\n\n` +
          `可能原因：\n` +
          `1. PR源分支已被删除\n` +
          `2. 分支名称有误（包含特殊字符如斜杠）\n` +
          `3. 仓库权限不足\n` +
          `4. GitCode API 调用失败\n\n` +
          `建议：请在GitCode仓库中检查分支状态`;

        this.emitError(workflowId, 'verify-branch', errorMsg);
        this.updateStep(workflowId, 'verify-branch', 'failed');
        throw new Error(errorMsg);
      }

      // 步骤2: 检查 Docker 是否可用
      this.emitOutput(workflowId, 'fetch-pr', '正在检查 Docker 环境...\n');
      const dockerCheck = await checkDockerAvailable();
      if (!dockerCheck.available) {
        const errorMsg =
          `Docker 环境检查失败\n\n` +
          `${dockerCheck.error || 'Docker 不可用'}\n\n` +
          `请检查：\n` +
          `1. Docker 是否已安装\n` +
          `2. Docker 服务是否正在运行 (systemctl status docker)\n` +
          `3. 当前用户是否有权限执行 Docker 命令\n\n` +
          `解决方法：\n` +
          `- Linux: sudo systemctl start docker\n` +
          `- macOS: 启动 Docker Desktop\n` +
          `- Windows: 启动 Docker Desktop`;

        this.emitError(workflowId, 'fetch-pr', errorMsg);
        this.updateStep(workflowId, 'fetch-pr', 'failed', errorMsg);
        throw new Error(errorMsg);
      }
      this.emitOutput(workflowId, 'fetch-pr', '✓ Docker 可用\n');

      // 获取配置
      const {
        packageManager = 'npm',
        buildCommand,
        lintCommand,
        baseImage = 'node:22',
        registryMirror = 'docker.m.daocloud.io', // 默认使用DaoCloud镜像源（2025年可用）
        timeout,
      } = config;

      // 步骤3: 检查镜像是否存在，不存在则拉取
      this.emitOutput(workflowId, 'fetch-pr', `正在检查镜像 ${baseImage}...\n`);
      const imageExists = await checkImageExists(baseImage);

      if (!imageExists) {
        this.emitOutput(workflowId, 'fetch-pr', `⚠️  镜像 ${baseImage} 不存在，需要拉取。\n`);

        // 拉取镜像（使用镜像源）
        const pullResult = await pullDockerImage(
          baseImage,
          registryMirror, // 传递镜像源
          (text) => {
            this.emitOutput(workflowId, 'fetch-pr', text);
          },
        );

        if (!pullResult.success) {
          const errorMsg =
            pullResult.error || `镜像拉取失败。\n\n请手动拉取镜像后重试: docker pull ${baseImage}`;

          this.emitError(workflowId, 'fetch-pr', errorMsg);
          this.updateStep(workflowId, 'fetch-pr', 'failed', errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        this.emitOutput(workflowId, 'fetch-pr', `✓ 镜像 ${baseImage} 已存在\n`);
      }

      // 步骤3.5: 创建并启动持久容器
      this.emitOutput(workflowId, 'fetch-pr', `正在创建工作容器 ${containerName}...\n`);
      const createResult = await createAndStartContainer(containerName, baseImage, {
        GITCODE_TOKEN: process.env.GITCODE_TOKEN || '',
      });

      if (!createResult.success) {
        const errorMsg = createResult.error || '容器创建失败';
        this.emitError(workflowId, 'fetch-pr', errorMsg);
        this.updateStep(workflowId, 'fetch-pr', 'failed', errorMsg);
        throw new Error(errorMsg);
      }

      this.emitOutput(workflowId, 'fetch-pr', `✓ 工作容器已创建并启动\n`);

      // 步骤4: 初始化环境（docker-init）
      this.updateStep(workflowId, 'docker-init', 'running');
      this.emitOutput(workflowId, 'docker-init', '正在初始化环境...\n');

      const initCommand = buildInitCommand(repoUrl, sourceBranch, packageManager);
      const initResult = await execInContainer(containerName, initCommand, timeout, (data) => {
        this.updateStep(workflowId, 'docker-init', 'running', data);
        this.emitOutput(workflowId, 'docker-init', data);
      });

      if (!initResult.success) {
        this.updateStep(workflowId, 'docker-init', 'failed', initResult.error);
        workflow.status = 'failed';
        workflow.error = initResult.error;
        this.emitError(workflowId, 'docker-init', initResult.error || 'Initialization failed');
        throw new Error(initResult.error || 'Initialization failed');
      }

      this.updateStep(workflowId, 'docker-init', 'success');
      this.emitOutput(workflowId, 'docker-init', '\n✅ 初始化完成\n');

      // 步骤5: 构建测试（docker-build）
      this.updateStep(workflowId, 'docker-build', 'running');
      this.emitOutput(workflowId, 'docker-build', '正在执行构建测试...\n');

      const buildCmd = buildBuildCommand(packageManager, buildCommand);
      const buildResult = await execInContainer(containerName, buildCmd, timeout, (data) => {
        this.updateStep(workflowId, 'docker-build', 'running', data);
        this.emitOutput(workflowId, 'docker-build', data);
      });

      if (!buildResult.success) {
        this.updateStep(workflowId, 'docker-build', 'failed', buildResult.error);
        workflow.status = 'failed';
        workflow.error = buildResult.error;
        this.emitError(workflowId, 'docker-build', buildResult.error || 'Build failed');
        throw new Error(buildResult.error || 'Build failed');
      }

      this.updateStep(workflowId, 'docker-build', 'success');
      this.emitOutput(workflowId, 'docker-build', '\n✅ 构建测试通过\n');

      // 步骤6: Lint测试（docker-lint）
      this.updateStep(workflowId, 'docker-lint', 'running');
      this.emitOutput(workflowId, 'docker-lint', '正在执行Lint测试...\n');

      const lintCmd = buildLintCommand(packageManager, lintCommand);
      const lintResult = await execInContainer(containerName, lintCmd, timeout, (data) => {
        this.updateStep(workflowId, 'docker-lint', 'running', data);
        this.emitOutput(workflowId, 'docker-lint', data);
      });

      if (!lintResult.success) {
        this.updateStep(workflowId, 'docker-lint', 'failed', lintResult.error);
        workflow.status = 'failed';
        workflow.error = lintResult.error;
        this.emitError(workflowId, 'docker-lint', lintResult.error || 'Lint failed');
        throw new Error(lintResult.error || 'Lint failed');
      }

      this.updateStep(workflowId, 'docker-lint', 'success');
      this.emitOutput(workflowId, 'docker-lint', '\n✅ Lint测试通过\n');

      // 所有测试通过
      workflow.status = 'success';

      workflow.completedAt = new Date().toISOString();
      this.emitComplete(workflowId, workflow.status);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      workflow.status = 'failed';
      workflow.error = errorMessage;
      workflow.completedAt = new Date().toISOString();

      // 标记当前运行的步骤为失败
      const runningStep = workflow.steps.find((s) => s.status === 'running');
      if (runningStep) {
        this.updateStep(workflowId, runningStep.name, 'failed', errorMessage);
      }

      // 如果已经有步骤被标记为 failed，说明错误已经被处理过
      // 只在没有失败步骤时才发送通用错误
      const failedStep = workflow.steps.find((s) => s.status === 'failed');
      if (!failedStep) {
        this.emitError(workflowId, 'workflow', errorMessage);
      }

      this.emitComplete(workflowId, 'failed');
      // 不再抛出错误，让 catch 块"吞掉"异常
    } finally {
      // 清理容器（无论成功还是失败都要删除）
      try {
        await removeContainer(containerName);
        console.log(`[Workflow ${workflowId}] Container ${containerName} removed`);
      } catch (error) {
        console.error(
          `[Workflow ${workflowId}] Failed to remove container ${containerName}:`,
          error,
        );
      }
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
