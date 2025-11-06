import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type {
  WorkflowConfig,
  CreateWorkflowConfigRequest,
  UpdateWorkflowConfigRequest,
} from '../types/workflow-config.js';

interface RepoConfigFile {
  configs: WorkflowConfig[];
}

/**
 * Workflow 配置管理服务
 * 使用文件系统存储配置：~/.gitcode/workflow-configs/<owner>-<repo>.json
 */
class WorkflowConfigService {
  private readonly configDir: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.gitcode', 'workflow-configs');
  }

  /**
   * 确保配置目录存在
   */
  private async ensureConfigDir(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
  }

  /**
   * 获取配置文件路径
   */
  private getConfigFilePath(owner: string, repo: string): string {
    return path.join(this.configDir, `${owner}-${repo}.json`);
  }

  /**
   * 加载仓库配置文件
   */
  private async loadRepoConfigs(owner: string, repo: string): Promise<RepoConfigFile> {
    const filePath = this.getConfigFilePath(owner, repo);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as RepoConfigFile;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        // 文件不存在，返回空配置
        return { configs: [] };
      }
      throw error;
    }
  }

  /**
   * 保存仓库配置文件
   */
  private async saveRepoConfigs(owner: string, repo: string, data: RepoConfigFile): Promise<void> {
    await this.ensureConfigDir();
    const filePath = this.getConfigFilePath(owner, repo);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 生成配置 ID
   */
  private generateConfigId(owner: string, repo: string, name: string): string {
    const timestamp = Date.now();
    const safeName = name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    return `${owner}-${repo}-${safeName}-${timestamp}`;
  }

  /**
   * 创建配置
   */
  async create(
    owner: string,
    repo: string,
    request: CreateWorkflowConfigRequest,
  ): Promise<WorkflowConfig> {
    const repoData = await this.loadRepoConfigs(owner, repo);

    // 检查是否已存在同名配置
    const existing = repoData.configs.find((c) => c.name === request.name);
    if (existing) {
      throw new Error(`Configuration with name "${request.name}" already exists`);
    }

    const config: WorkflowConfig = {
      configId: this.generateConfigId(owner, repo, request.name),
      owner,
      repo,
      name: request.name,
      steps: request.steps,
      env: request.env,
      timeout: request.timeout,
    };

    repoData.configs.push(config);
    await this.saveRepoConfigs(owner, repo, repoData);

    return config;
  }

  /**
   * 列出仓库的所有配置
   */
  async listByRepo(owner: string, repo: string): Promise<WorkflowConfig[]> {
    const repoData = await this.loadRepoConfigs(owner, repo);
    return repoData.configs;
  }

  /**
   * 通过 ID 获取配置
   */
  async getById(configId: string): Promise<WorkflowConfig | null> {
    // 从 configId 解析 owner 和 repo
    const parts = configId.split('-');
    if (parts.length < 4) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1];

    const repoData = await this.loadRepoConfigs(owner, repo);
    return repoData.configs.find((c) => c.configId === configId) || null;
  }

  /**
   * 更新配置
   */
  async update(configId: string, updates: UpdateWorkflowConfigRequest): Promise<WorkflowConfig> {
    // 从 configId 解析 owner 和 repo
    const parts = configId.split('-');
    if (parts.length < 4) {
      throw new Error(`Invalid configId: ${configId}`);
    }

    const owner = parts[0];
    const repo = parts[1];

    const repoData = await this.loadRepoConfigs(owner, repo);
    const index = repoData.configs.findIndex((c) => c.configId === configId);

    if (index === -1) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    // 如果修改了 name，检查是否与其他配置冲突
    if (updates.name && updates.name !== repoData.configs[index].name) {
      const existing = repoData.configs.find((c) => c.name === updates.name);
      if (existing) {
        throw new Error(`Configuration with name "${updates.name}" already exists`);
      }
    }

    // 更新配置
    const updated: WorkflowConfig = {
      ...repoData.configs[index],
      ...updates,
    };

    repoData.configs[index] = updated;
    await this.saveRepoConfigs(owner, repo, repoData);

    return updated;
  }

  /**
   * 删除配置
   */
  async delete(configId: string): Promise<void> {
    // 从 configId 解析 owner 和 repo
    const parts = configId.split('-');
    if (parts.length < 4) {
      throw new Error(`Invalid configId: ${configId}`);
    }

    const owner = parts[0];
    const repo = parts[1];

    const repoData = await this.loadRepoConfigs(owner, repo);
    const index = repoData.configs.findIndex((c) => c.configId === configId);

    if (index === -1) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    repoData.configs.splice(index, 1);
    await this.saveRepoConfigs(owner, repo, repoData);
  }
}

// 导出单例
export const workflowConfigService = new WorkflowConfigService();
