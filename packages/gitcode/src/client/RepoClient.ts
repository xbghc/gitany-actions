import type { GitcodeClient } from './core';
import type { RepoRole } from '../types/repo-role';

// Type imports
import type { SelfPermissionResponse } from '../api/repo/self-permission';
import type {
  RepoSettings,
  RepoEvents,
  Contributors,
  Branch,
  Branches,
  Commits,
  FileBlob,
  Compare,
  Webhook,
  Webhooks,
} from '../api/repo';

// Value imports
import { selfPermissionUrl, selfPermissionResponseSchema } from '../api/repo/self-permission';
import {
  repoSettingsSchema,
  repoSettingsUrl,
  repoEventsSchema,
  repoEventsUrl,
  contributorsSchema,
  contributorsUrl,
  branchSchema,
  branchesUrl,
  branchUrl,
  commitSchema,
  commitsUrl,
  fileBlobSchema,
  fileBlobUrl,
  compareSchema,
  compareUrl,
  webhookSchema,
  webhooksUrl,
  webhookUrl,
} from '../api/repo';

export class RepoClient {
  constructor(private readonly client: GitcodeClient) {}

  private extractRepoRoleFromSelfPermission(result: unknown): RepoRole {
    if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      const role = (obj.role_info ?? obj.roleInfo) as Record<string, unknown> | undefined;
      if (!role) {
        return 'read';
      }
      const cn = typeof role.cn_name === 'string' ? (role.cn_name as string).trim() : '';
      if (cn.includes('管理员')) return 'admin';
      if (cn.includes('维护者') || cn.includes('开发者')) return 'write';
      return 'read';
    }
    return 'read';
  }

  async getPermission(params: {
    owner: string;
    repo: string;
  }): Promise<SelfPermissionResponse> {
    const path = selfPermissionUrl(params);
    const json = await this.client.request(path, 'GET', {});
    return selfPermissionResponseSchema.parse(json);
  }

  async getPermissionRole(params: { owner: string; repo: string }): Promise<RepoRole> {
    try {
      const json = await this.getPermission(params);
      return this.extractRepoRoleFromSelfPermission(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/\b404\b/.test(msg)) {
        return 'none';
      }
      throw err;
    }
  }

  async getSettings(params: { owner: string; repo: string }): Promise<RepoSettings> {
    const url = repoSettingsUrl(params.owner, params.repo);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return repoSettingsSchema.parse(data);
  }

  async getEvents(params: { owner: string; repo: string }): Promise<RepoEvents> {
    const url = repoEventsUrl(params.owner, params.repo);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return repoEventsSchema.parse(data);
  }

  async getContributors(params: { owner: string; repo: string }): Promise<Contributors> {
    const url = contributorsUrl(params.owner, params.repo);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return contributorsSchema.parse(data);
  }

  async getBranches(params: { owner: string; repo: string }): Promise<Branches> {
    const url = branchesUrl(params.owner, params.repo);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return branchSchema.array().parse(data);
  }

  async getBranch(params: { owner: string; repo: string; branch: string }): Promise<Branch> {
    const url = branchUrl(params.owner, params.repo, params.branch);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return branchSchema.parse(data);
  }

  async getCommits(params: { owner: string; repo: string }): Promise<Commits> {
    const url = commitsUrl(params.owner, params.repo);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return commitSchema.array().parse(data);
  }

  async getFileBlob(params: { owner: string; repo: string; sha: string }): Promise<FileBlob> {
    const url = fileBlobUrl(params.owner, params.repo, params.sha);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return fileBlobSchema.parse(data);
  }

  async compare(params: {
    owner: string;
    repo: string;
    base: string;
    head: string;
  }): Promise<Compare> {
    const url = compareUrl(params.owner, params.repo, params.base, params.head);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return compareSchema.parse(data);
  }

  async getWebhooks(params: { owner: string; repo: string }): Promise<Webhooks> {
    const url = webhooksUrl(params.owner, params.repo);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return webhookSchema.array().parse(data);
  }

  async getWebhook(params: { owner: string; repo: string; id: number }): Promise<Webhook> {
    const url = webhookUrl(params.owner, params.repo, params.id);
    const data = await this.client.request<unknown>(url, 'GET', {});
    return webhookSchema.parse(data);
  }
}
