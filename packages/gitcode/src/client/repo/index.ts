import { type SelfPermissionResponse } from '../../api/repo/self-permission';
import type { RepoRole } from '../../types/repo-role';
import type { GitcodeClient } from '../core';
import { getSelfRepoPermission, getSelfRepoPermissionRole } from './permission';
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
  type RepoSettings,
  type RepoEvents,
  type Contributors,
  type Branch,
  type Branches,
  type Commits,
  type FileBlob,
  type Compare,
  type Webhook,
  type Webhooks,
} from '../../api/repo';

export async function getRepoSettings(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<RepoSettings> {
  const url = repoSettingsUrl(owner, repo);
  const data = await client.request<unknown>(url, 'GET', {});
  return repoSettingsSchema.parse(data);
}

export async function getRepoEvents(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<RepoEvents> {
  const url = repoEventsUrl(owner, repo);
  const data = await client.request<unknown>(url, 'GET', {});
  return repoEventsSchema.parse(data);
}

export async function getContributors(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<Contributors> {
  const url = contributorsUrl(owner, repo);
  const data = await client.request<unknown>(url, 'GET', {});
  return contributorsSchema.parse(data);
}

export async function getBranches(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<Branches> {
  const url = branchesUrl(owner, repo);
  const data = await client.request<unknown>(url, 'GET', {});
  return branchSchema.array().parse(data);
}

export async function getBranch(
  client: GitcodeClient,
  owner: string,
  repo: string,
  branch: string,
): Promise<Branch> {
  const url = branchUrl(owner, repo, branch);
  const data = await client.request<unknown>(url, 'GET', {});
  return branchSchema.parse(data);
}

export async function getCommits(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<Commits> {
  const url = commitsUrl(owner, repo);
  const data = await client.request<unknown>(url, 'GET', {});
  return commitSchema.array().parse(data);
}

export async function getFileBlob(
  client: GitcodeClient,
  owner: string,
  repo: string,
  sha: string,
): Promise<FileBlob> {
  const url = fileBlobUrl(owner, repo, sha);
  const data = await client.request<unknown>(url, 'GET', {});
  return fileBlobSchema.parse(data);
}

export async function compare(
  client: GitcodeClient,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<Compare> {
  const url = compareUrl(owner, repo, base, head);
  const data = await client.request<unknown>(url, 'GET', {});
  return compareSchema.parse(data);
}

export async function getWebhooks(
  client: GitcodeClient,
  owner: string,
  repo: string,
): Promise<Webhooks> {
  const url = webhooksUrl(owner, repo);
  const data = await client.request<unknown>(url, 'GET', {});
  return webhookSchema.array().parse(data);
}

export async function getWebhook(
  client: GitcodeClient,
  owner: string,
  repo: string,
  id: number,
): Promise<Webhook> {
  const url = webhookUrl(owner, repo, id);
  const data = await client.request<unknown>(url, 'GET', {});
  return webhookSchema.parse(data);
}

export class GitcodeClientRepo {
  constructor(private client: GitcodeClient) {}

  async getSelfRepoPermission(url: string): Promise<SelfPermissionResponse> {
    return await getSelfRepoPermission(this.client, url);
  }

  async getSelfRepoPermissionRole(url: string): Promise<RepoRole> {
    return await getSelfRepoPermissionRole(this.client, url);
  }

  async getSettings(owner: string, repo: string): Promise<RepoSettings> {
    return await getRepoSettings(this.client, owner, repo);
  }

  async getEvents(owner: string, repo: string): Promise<RepoEvents> {
    return await getRepoEvents(this.client, owner, repo);
  }

  async getContributors(owner: string, repo: string): Promise<Contributors> {
    return await getContributors(this.client, owner, repo);
  }

  async getBranches(owner: string, repo: string): Promise<Branches> {
    return await getBranches(this.client, owner, repo);
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<Branch> {
    return await getBranch(this.client, owner, repo, branch);
  }

  async getCommits(owner: string, repo: string): Promise<Commits> {
    return await getCommits(this.client, owner, repo);
  }

  async getFileBlob(owner: string, repo: string, sha: string): Promise<FileBlob> {
    return await getFileBlob(this.client, owner, repo, sha);
  }

  async compare(owner: string, repo: string, base: string, head: string): Promise<Compare> {
    return await compare(this.client, owner, repo, base, head);
  }

  async getWebhooks(owner: string, repo: string): Promise<Webhooks> {
    return await getWebhooks(this.client, owner, repo);
  }

  async getWebhook(owner: string, repo: string, id: number): Promise<Webhook> {
    return await getWebhook(this.client, owner, repo, id);
  }
}
