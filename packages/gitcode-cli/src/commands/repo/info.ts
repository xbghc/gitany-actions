import { Command } from 'commander';
import { withClient } from '../../utils/with-client';
import { createLogger } from '@gitany/shared';

const logger = createLogger('gitcode-cli:repo');

export async function repoSettingsCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const settings = await client.repo.getSettings(owner, repo);

    logger.info(settings, '仓库设置');
  }, '获取仓库设置失败');
}

export async function repoBranchesCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const branches = await client.repo.getBranches(owner, repo);

    logger.info({ branches: branches.length }, '仓库分支');
    branches.forEach((branch) => {
      logger.info(
        { name: branch.name, default: branch.default, protected: branch.protected },
        `${branch.name} (默认: ${branch.default ? '是' : '否'}, 受保护: ${branch.protected ? '是' : '否'})`,
      );
    });
  }, '获取仓库分支失败');
}

export async function repoCommitsCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const commits = await client.repo.getCommits(owner, repo);

    logger.info({ commits: commits.length }, '仓库提交历史');
    commits.forEach((commit, index) => {
      logger.info(
        {
          index: index + 1,
          sha: commit.sha.substring(0, 7),
          message: commit.commit.message.trim(),
          author: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date,
        },
        `${index + 1}. ${commit.sha.substring(0, 7)} - ${commit.commit.message.trim()}`,
      );
    });
  }, '获取仓库提交历史失败');
}

export async function repoContributorsCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const contributors = await client.repo.getContributors(owner, repo);

    logger.info({ contributors: contributors.length }, '仓库贡献者');
    contributors.forEach((contributor) => {
      logger.info(
        {
          name: contributor.name,
          email: contributor.email,
          contributions: contributor.contributions,
        },
        `${contributor.name} <${contributor.email}> - ${contributor.contributions} 次贡献`,
      );
    });
  }, '获取仓库贡献者失败');
}

export async function repoWebhooksCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const webhooks = await client.repo.getWebhooks(owner, repo);

    logger.info({ webhooks: webhooks.length }, '仓库 Webhooks');
    webhooks.forEach((webhook) => {
      logger.info(
        {
          id: webhook.id,
          url: webhook.url,
          name: webhook.name,
          active: webhook.active,
          events: webhook.events,
          created_at: webhook.created_at,
        },
        `Webhook ${webhook.id}: ${webhook.name}`,
      );
    });
  }, '获取仓库 Webhooks 失败');
}

export function repoSubCommand(): Command {
  const repoProgram = new Command('repo');

  repoProgram
    .command('settings <owner> <repo>')
    .description('Show repository settings')
    .action(repoSettingsCommand);

  repoProgram
    .command('branches <owner> <repo>')
    .description('List repository branches')
    .action(repoBranchesCommand);

  repoProgram
    .command('commits <owner> <repo>')
    .description('Show repository commits')
    .action(repoCommitsCommand);

  repoProgram
    .command('contributors <owner> <repo>')
    .description('Show repository contributors')
    .action(repoContributorsCommand);

  repoProgram
    .command('webhooks <owner> <repo>')
    .description('List repository webhooks')
    .action(repoWebhooksCommand);

  return repoProgram;
}
