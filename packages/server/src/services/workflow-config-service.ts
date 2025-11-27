import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type {
  WorkflowConfig,
  CreateWorkflowConfigRequest,
  UpdateWorkflowConfigRequest,
} from '@xbghc/gitcode-actions';

/**
 * Workflow 配置管理服务
 * 使用文件系统存储配置：~/.gitcode/repos/<owner>/<repo>/workflows.json
 */
class WorkflowConfigService {
  /**
   * 获取仓库目录路径
   */
  private getRepoDir(owner: string, repo: string): string {
    return path.join(os.homedir(), '.gitcode', 'repos', owner, repo);
  }

  /**
   * 获取 workflows.json 文件路径
   */
  private getWorkflowsFilePath(owner: string, repo: string): string {
    return path.join(this.getRepoDir(owner, repo), 'workflows.json');
  }

  /**
   * 加载仓库的 workflow 配置列表
   */
  private async loadWorkflows(owner: string, repo: string): Promise<WorkflowConfig[]> {
    const filePath = this.getWorkflowsFilePath(owner, repo);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as WorkflowConfig[];
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        // 文件不存在，返回空数组
        return [];
      }
      throw error;
    }
  }

  /**
   * 保存仓库的 workflow 配置列表
   */
  private async saveWorkflows(
    owner: string,
    repo: string,
    configs: WorkflowConfig[],
  ): Promise<void> {
    const repoDir = this.getRepoDir(owner, repo);
    await fs.mkdir(repoDir, { recursive: true });
    const filePath = this.getWorkflowsFilePath(owner, repo);
    await fs.writeFile(filePath, JSON.stringify(configs, null, 2), 'utf-8');
  }

  /**
   * 生成配置 ID (UUID)
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 创建配置
   */
  async create(
    owner: string,
    repo: string,
    request: CreateWorkflowConfigRequest,
  ): Promise<WorkflowConfig> {
    const configs = await this.loadWorkflows(owner, repo);

    // 检查是否已存在同名配置
    const existing = configs.find((c) => c.name === request.name);
    if (existing) {
      throw new Error(`Configuration with name "${request.name}" already exists`);
    }

    const config: WorkflowConfig = {
      id: this.generateId(),
      name: request.name,
      steps: request.steps,
      env: request.env,
      timeout: request.timeout,
      beforeAll: request.beforeAll,
      afterAll: request.afterAll,
      baseImage: request.baseImage,
      registryMirror: request.registryMirror,
    };

    configs.push(config);
    await this.saveWorkflows(owner, repo, configs);

    return config;
  }

  /**
   * 列出仓库的所有配置
   */
  async listByRepo(owner: string, repo: string): Promise<WorkflowConfig[]> {
    return await this.loadWorkflows(owner, repo);
  }

  /**
   * 更新配置
   */
  async update(
    owner: string,
    repo: string,
    id: string,
    updates: UpdateWorkflowConfigRequest,
  ): Promise<WorkflowConfig> {
    const configs = await this.loadWorkflows(owner, repo);
    const index = configs.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new Error(`Configuration not found: ${id}`);
    }

    // 如果修改了 name，检查是否与其他配置冲突
    if (updates.name && updates.name !== configs[index].name) {
      const existing = configs.find((c) => c.name === updates.name);
      if (existing) {
        throw new Error(`Configuration with name "${updates.name}" already exists`);
      }
    }

    // 更新配置
    const updated: WorkflowConfig = {
      ...configs[index],
      ...updates,
    };

    configs[index] = updated;
    await this.saveWorkflows(owner, repo, configs);

    return updated;
  }

  /**
   * 删除配置
   */
  async delete(owner: string, repo: string, id: string): Promise<void> {
    const configs = await this.loadWorkflows(owner, repo);
    const index = configs.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new Error(`Configuration not found: ${id}`);
    }

    configs.splice(index, 1);
    await this.saveWorkflows(owner, repo, configs);
  }
}

// 导出单例
export const workflowConfigService = new WorkflowConfigService();
