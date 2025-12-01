import type { GitCodeClient } from '@xbghc/gitcode-api';
import { EventEmitter } from 'events';
import type { WorkflowConfig } from '@xbghc/gitcode-actions';
import type {
  SSECompleteMessage,
  SSEErrorMessage,
  SSEOutputMessage,
  SSEStepMessage,
  WorkflowResult,
  WorkflowStatus,
} from '../types/workflow.js';
import { workflowLogService } from './workflow-log-service.js';
import { jobExecutorService } from './job-executor-service.js';
import { logger } from '../utils/logger.js';

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

    // 持久化workflow日志到文件系统
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflowLogService.saveWorkflowLog(workflow).catch((error) => {
        logger.error({ workflowId, error }, 'Failed to save workflow log');
      });
    }
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

    // 获取 PR 信息以确定分支
    let branch = '';
    try {
      const pr = await gitcodeClient.pr.get(repoUrl, prNumber);
      branch = pr.head.ref;
    } catch (error) {
      logger.error({ owner, repo, prNumber, error }, 'Failed to fetch PR info');
      throw new Error(`无法获取 PR #${prNumber} 信息，请检查网络或权限`);
    }

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

    // 直接执行任务（异步，不阻塞返回）
    this.executeJob(workflowId, repoUrl, branch, config).catch((error) => {
      logger.error({ workflowId, error }, 'Job execution failed');
    });

    return workflowId;
  }

  /**
   * 执行任务
   * @internal
   */
  private async executeJob(
    workflowId: string,
    repoUrl: string,
    branch: string,
    config: WorkflowConfig,
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    workflow.status = 'running';

    try {
      await jobExecutorService.execute(
        {
          workflowId,
          repoUrl,
          branch,
          config,
          gitcodeToken: process.env.GITCODE_TOKEN,
        },
        {
          onStepStart: (stepName) => {
            this.updateStep(workflowId, stepName, 'running');
          },
          onStepOutput: (stepName, output) => {
            this.updateStep(workflowId, stepName, 'running', output);
            this.emitOutput(workflowId, stepName, output);
          },
          onStepSuccess: (stepName) => {
            this.updateStep(workflowId, stepName, 'success');
          },
          onStepFailed: (stepName, error) => {
            this.updateStep(workflowId, stepName, 'failed');
            this.emitError(workflowId, stepName, error);
          },
        },
      );

      // 任务成功
      workflow.status = 'success';
      workflow.completedAt = new Date().toISOString();
      this.emitComplete(workflowId, 'success');
    } catch (error) {
      // 任务失败
      const errorMsg = error instanceof Error ? error.message : String(error);
      workflow.status = 'failed';
      workflow.completedAt = new Date().toISOString();
      workflow.error = errorMsg;
      this.emitError(workflowId, 'workflow', errorMsg);
      this.emitComplete(workflowId, 'failed');
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
