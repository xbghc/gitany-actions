import {
  branchesUrl,
  branchSchema,
  branchUrl,
  commitSchema,
  commitsUrl,
  compareSchema,
  compareUrl,
  contributorsSchema,
  contributorsUrl,
  fileBlobSchema,
  fileBlobUrl,
  notificationsResponseSchema,
  notificationsUrl,
  repoEventsSchema,
  repoEventsUrl,
  repoSettingsSchema,
  repoSettingsUrl,
  webhookSchema,
  webhooksUrl,
  webhookUrl,
  type Branch,
  type Branches,
  type Commits,
  type Compare,
  type Contributors,
  type FileBlob,
  type MarkNotificationsReadParams,
  type NotificationQuery,
  type NotificationsResponse,
  type RepoEvents,
  type RepoSettings,
  type Webhook,
  type Webhooks,
} from '../../api/repo/index.js';
import { type SelfPermissionResponse } from '../../api/repo/self-permission.js';
import type { RepoRole } from '../../types/repo-role.js';
import type { GitCodeClient } from '../core.js';
import { getSelfRepoPermission, getSelfRepoPermissionRole } from './permission.js';

export async function getRepoSettings(
  client: GitCodeClient,
  owner: string,
  repo: string,
): Promise<RepoSettings> {
  const url = repoSettingsUrl(owner, repo);
  const data = await client.http.get(url).json();
  return repoSettingsSchema.parse(data);
}

export async function getRepoEvents(
  client: GitCodeClient,
  owner: string,
  repo: string,
): Promise<RepoEvents> {
  const url = repoEventsUrl(owner, repo);
  const data = await client.http.get(url).json();
  return repoEventsSchema.parse(data);
}

export async function getContributors(
  client: GitCodeClient,
  owner: string,
  repo: string,
): Promise<Contributors> {
  const url = contributorsUrl(owner, repo);
  const data = await client.http.get(url).json();
  return contributorsSchema.parse(data);
}

export async function getBranches(
  client: GitCodeClient,
  owner: string,
  repo: string,
): Promise<Branches> {
  const url = branchesUrl(owner, repo);
  const data = await client.http.get(url).json();
  return branchSchema.array().parse(data);
}

export async function getBranch(
  client: GitCodeClient,
  owner: string,
  repo: string,
  branch: string,
): Promise<Branch> {
  const url = branchUrl(owner, repo, branch);
  const data = await client.http.get(url).json();
  return branchSchema.parse(data);
}

export async function getCommits(
  client: GitCodeClient,
  owner: string,
  repo: string,
): Promise<Commits> {
  const url = commitsUrl(owner, repo);
  const data = await client.http.get(url).json();
  return commitSchema.array().parse(data);
}

export async function getFileBlob(
  client: GitCodeClient,
  owner: string,
  repo: string,
  sha: string,
): Promise<FileBlob> {
  const url = fileBlobUrl(owner, repo, sha);
  const data = await client.http.get(url).json();
  return fileBlobSchema.parse(data);
}

export async function compare(
  client: GitCodeClient,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<Compare> {
  const url = compareUrl(owner, repo, base, head);
  const data = await client.http.get(url).json();
  return compareSchema.parse(data);
}

export async function getWebhooks(
  client: GitCodeClient,
  owner: string,
  repo: string,
): Promise<Webhooks> {
  const url = webhooksUrl(owner, repo);
  const data = await client.http.get(url).json();
  return webhookSchema.array().parse(data);
}

export async function getWebhook(
  client: GitCodeClient,
  owner: string,
  repo: string,
  id: number,
): Promise<Webhook> {
  const url = webhookUrl(owner, repo, id);
  const data = await client.http.get(url).json();
  return webhookSchema.parse(data);
}

export async function getNotifications(
  client: GitCodeClient,
  owner: string,
  repo: string,
  query?: NotificationQuery,
): Promise<NotificationsResponse> {
  const url = notificationsUrl(owner, repo);
  const data = await client.http
    .get(url, {
      searchParams: query as Record<string, string | number | boolean>,
    })
    .json();
  return notificationsResponseSchema.parse(data);
}

export async function markNotificationsRead(
  client: GitCodeClient,
  owner: string,
  repo: string,
  params: MarkNotificationsReadParams,
): Promise<void> {
  const url = notificationsUrl(owner, repo);
  await client.http.put(url, {
    searchParams: params as unknown as Record<string, string | number | boolean>,
  });
}

export class GitCodeClientRepo {
  constructor(private client: GitCodeClient) {}

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

  async getNotifications(
    owner: string,
    repo: string,
    query?: NotificationQuery,
  ): Promise<NotificationsResponse> {
    return await getNotifications(this.client, owner, repo, query);
  }

  async markNotificationsRead(
    owner: string,
    repo: string,
    params: MarkNotificationsReadParams,
  ): Promise<void> {
    return await markNotificationsRead(this.client, owner, repo, params);
  }
}
