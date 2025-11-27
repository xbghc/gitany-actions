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
import { runnerService } from './runner-service.js';
import type { RunnerJob } from '@xbghc/gitcode-actions';
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
   * 处理Runner更新
   */
  public handleRunnerUpdate(
    workflowId: string,
    update: { status: string; logs?: string; error?: string; stepName?: string },
  ) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const { status, logs, error, stepName } = update;

    // 如果有具体的 stepName，更新该步骤
    if (stepName) {
      let wfStatus: WorkflowStatus = 'pending';
      if (status === 'running') wfStatus = 'running';
      if (status === 'success') wfStatus = 'success';
      if (status === 'failed') wfStatus = 'failed';
      // 注意：runner可能发送 pending 状态，这里主要是 running/success/failed

      this.updateStep(workflowId, stepName, wfStatus, logs);
    } else if (logs) {
      // 无 stepName 的日志，暂时归入 generic log 或者忽略
      // 这里可以尝试归入当前正在运行的 step
      const runningStep = workflow.steps.find((s) => s.status === 'running');
      if (runningStep) {
        this.updateStep(workflowId, runningStep.name, 'running', logs);
      }
    }

    if (error) {
      this.emitError(workflowId, stepName || 'workflow', error);
    }

    // 如果是整个 workflow 完成
    if (status === 'success' || status === 'failed') {
      workflow.status = status;
      workflow.completedAt = new Date().toISOString();
      if (error) workflow.error = error;
      this.emitComplete(workflowId, status as WorkflowStatus);
    }
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

    // 将任务放入队列
    const job: RunnerJob = {
      id: workflowId,
      workflowId,
      type: 'workflow',
      payload: {
        workflowId,
        owner,
        repo,
        prNumber,
        repoUrl,
        branch,
        config,
        gitcodeToken: process.env.GITCODE_TOKEN,
      },
    };

    runnerService.enqueueJob(job);

    // 通知前端任务已排队
    this.emitOutput(workflowId, 'fetch-pr', 'Job enqueued. Waiting for available runner...\n');

    return workflowId;
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
