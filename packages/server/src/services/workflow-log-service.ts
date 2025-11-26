/**
 * Workflow日志持久化服务
 * 负责将workflow执行结果保存到文件系统，并提供查询接口
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { WorkflowResult, WorkflowLogMeta } from '../types/workflow.js';
import { logger } from '../utils/logger.js';

/**
 * WorkflowLogService类
 * 管理workflow日志的文件存储
 */
class WorkflowLogService {
  /**
   * 获取日志根目录
   * @returns ~/.gitcode/repos
   */
  private getLogRootDir(): string {
    return path.join(os.homedir(), '.gitcode', 'repos');
  }

  /**
   * 获取特定仓库的日志目录
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @returns ~/.gitcode/repos/<owner>/<repo>/logs/workflows
   */
  private getRepoLogDir(owner: string, repo: string): string {
    return path.join(this.getLogRootDir(), owner, repo, 'logs', 'workflows');
  }

  /**
   * 获取日志文件路径
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param workflowId Workflow ID
   * @returns 日志文件完整路径
   */
  private getLogFilePath(owner: string, repo: string, workflowId: string): string {
    const timestamp = this.extractTimestamp(workflowId);
    const fileName = `${timestamp}_${workflowId}.log`;
    return path.join(this.getRepoLogDir(owner, repo), fileName);
  }

  /**
   * 从workflowId中提取时间戳
   * workflowId格式: owner-repo-prNumber-timestamp
   */
  private extractTimestamp(workflowId: string): string {
    const parts = workflowId.split('-');
    return parts[parts.length - 1]; // 最后一部分是timestamp
  }

  /**
   * 计算workflow执行耗时
   * @param workflow WorkflowResult对象
   * @returns 耗时（毫秒），如果未完成则返回undefined
   */
  private calculateDuration(workflow: WorkflowResult): number | undefined {
    if (!workflow.completedAt) {
      return undefined;
    }
    const start = new Date(workflow.createdAt).getTime();
    const end = new Date(workflow.completedAt).getTime();
    return end - start;
  }

  /**
   * 将WorkflowResult转换为WorkflowLogMeta
   * @param workflow WorkflowResult对象
   * @returns WorkflowLogMeta对象
   */
  private toLogMeta(workflow: WorkflowResult): WorkflowLogMeta {
    return {
      workflowId: workflow.workflowId,
      owner: workflow.owner,
      repo: workflow.repo,
      prNumber: workflow.prNumber,
      configId: workflow.configId,
      configName: workflow.configName,
      status: workflow.status,
      createdAt: workflow.createdAt,
      completedAt: workflow.completedAt,
      duration: this.calculateDuration(workflow),
    };
  }

  /**
   * 保存workflow日志到文件
   * @param workflow WorkflowResult对象
   */
  async saveWorkflowLog(workflow: WorkflowResult): Promise<void> {
    const logDir = this.getRepoLogDir(workflow.owner, workflow.repo);
    const logFile = this.getLogFilePath(workflow.owner, workflow.repo, workflow.workflowId);

    // 确保目录存在
    await fs.mkdir(logDir, { recursive: true });

    // 保存为JSON格式
    const content = JSON.stringify(workflow, null, 2);
    await fs.writeFile(logFile, content, 'utf-8');
  }

  /**
   * 列出指定仓库的所有workflow日志
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @returns 日志元数据列表和总数
   */
  async listWorkflowLogs(
    owner: string,
    repo: string,
  ): Promise<{ logs: WorkflowLogMeta[]; count: number }> {
    const logDir = this.getRepoLogDir(owner, repo);

    try {
      // 读取目录下所有.log文件
      const files = await fs.readdir(logDir);
      const logFiles = files.filter((f) => f.endsWith('.log'));

      // 读取每个日志文件并转换为元数据
      const logs: WorkflowLogMeta[] = [];
      for (const file of logFiles) {
        const filePath = path.join(logDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const workflow: WorkflowResult = JSON.parse(content);
          logs.push(this.toLogMeta(workflow));
        } catch (error) {
          logger.warn({ file, error }, 'Failed to read log file, skipping corrupted file');
          // 跳过损坏的文件
        }
      }

      // 按创建时间倒序排列（最新的在前）
      logs.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

      return { logs, count: logs.length };
    } catch (error) {
      // 目录不存在时返回空列表
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { logs: [], count: 0 };
      }
      throw error;
    }
  }

  /**
   * 获取指定workflow的完整日志
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param id Workflow ID
   * @returns WorkflowResult对象，如果不存在则返回null
   */
  async getWorkflowLog(owner: string, repo: string, id: string): Promise<WorkflowResult | null> {
    const logFile = this.getLogFilePath(owner, repo, id);

    try {
      const content = await fs.readFile(logFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 文件不存在时返回null
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 删除指定workflow的日志
   * @param owner 仓库所有者
   * @param repo 仓库名称
   * @param id Workflow ID
   * @returns 是否删除成功
   */
  async deleteWorkflowLog(owner: string, repo: string, id: string): Promise<boolean> {
    const logFile = this.getLogFilePath(owner, repo, id);

    try {
      await fs.unlink(logFile);
      return true;
    } catch (error) {
      // 文件不存在时视为删除成功
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
}

// 导出单例
export const workflowLogService = new WorkflowLogService();
