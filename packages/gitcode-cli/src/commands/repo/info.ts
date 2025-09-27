import { Command } from 'commander';
import { withClient } from '../../utils/with-client';

export async function repoSettingsCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const settings = await client.repo.getSettings(owner, repo);

    console.log('仓库设置:');
    console.log(JSON.stringify(settings, null, 2));
  }, '获取仓库设置失败');
}

export async function repoBranchesCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const branches = await client.repo.getBranches(owner, repo);

    console.log('仓库分支:');
    branches.forEach((branch) => {
      console.log(
        `  ${branch.name} (默认: ${branch.default ? '是' : '否'}, 受保护: ${branch.protected ? '是' : '否'})`,
      );
    });
  }, '获取仓库分支失败');
}

export async function repoCommitsCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const commits = await client.repo.getCommits(owner, repo);

    console.log('仓库提交历史:');
    commits.forEach((commit, index) => {
      console.log(
        `  ${index + 1}. ${commit.sha.substring(0, 7)} - ${commit.commit.message.trim()}`,
      );
      console.log(`     作者: ${commit.commit.author.name} <${commit.commit.author.email}>`);
      console.log(`     时间: ${commit.commit.author.date}`);
      console.log();
    });
  }, '获取仓库提交历史失败');
}

export async function repoContributorsCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const contributors = await client.repo.getContributors(owner, repo);

    console.log('仓库贡献者:');
    contributors.forEach((contributor) => {
      console.log(
        `  ${contributor.name} <${contributor.email}> - ${contributor.contributions} 次贡献`,
      );
    });
  }, '获取仓库贡献者失败');
}

export async function repoWebhooksCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const webhooks = await client.repo.getWebhooks(owner, repo);

    console.log('仓库 Webhooks:');
    webhooks.forEach((webhook) => {
      console.log(`  ID: ${webhook.id}`);
      console.log(`  URL: ${webhook.url}`);
      console.log(`  名称: ${webhook.name}`);
      console.log(`  活跃: ${webhook.active ? '是' : '否'}`);
      console.log(`  事件: ${webhook.events.join(', ')}`);
      console.log(`  创建时间: ${webhook.created_at}`);
      console.log();
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
