import { Command } from 'commander';
import { parseGitUrl } from '@xbghc/gitcode-api';
import { withClient } from '../../utils/with-client.js';
import { resolveGitCodeRepoUrl } from '../../utils/resolve-repo-url.js';

interface RepoOptions {
  repo?: string;
}

async function resolveOwnerRepo(options: RepoOptions): Promise<{ owner: string; repo: string }> {
  let owner: string | undefined;
  let repo: string | undefined;

  if (options.repo) {
    const parsed = parseGitUrl(options.repo);
    if (parsed) {
      owner = parsed.owner;
      repo = parsed.repo;
    }
  }

  // 自动检测仓库
  if (!owner || !repo) {
    const repoUrl = await resolveGitCodeRepoUrl();
    const parsed = parseGitUrl(repoUrl);
    if (parsed) {
      owner = parsed.owner;
      repo = parsed.repo;
    }
  }

  if (!owner || !repo) {
    throw new Error('无法检测仓库信息，请在 git 仓库目录下运行或使用 --repo OWNER/REPO 指定');
  }

  return { owner, repo };
}

export async function repoSettingsCommand(options: RepoOptions = {}): Promise<void> {
  await withClient(async (client) => {
    const { owner, repo } = await resolveOwnerRepo(options);
    const settings = await client.repo.getSettings(owner, repo);
    console.log(JSON.stringify(settings, null, 2));
  }, '获取仓库设置失败');
}

export async function repoBranchesCommand(options: RepoOptions = {}): Promise<void> {
  await withClient(async (client) => {
    const { owner, repo } = await resolveOwnerRepo(options);
    const branches = await client.repo.getBranches(owner, repo);

    console.log(`仓库分支: ${branches.length}`);
    branches.forEach((branch) => {
      console.log(`${branch.name} (受保护: ${branch.protected ? '是' : '否'})`);
    });
  }, '获取仓库分支失败');
}

export async function repoCommitsCommand(options: RepoOptions = {}): Promise<void> {
  await withClient(async (client) => {
    const { owner, repo } = await resolveOwnerRepo(options);
    const commits = await client.repo.getCommits(owner, repo);

    console.log(`仓库提交历史: ${commits.length}`);
    commits.forEach((commit, index) => {
      console.log(`${index + 1}. ${commit.sha.substring(0, 7)} - ${commit.commit.message.trim()}`);
    });
  }, '获取仓库提交历史失败');
}

export async function repoContributorsCommand(options: RepoOptions = {}): Promise<void> {
  await withClient(async (client) => {
    const { owner, repo } = await resolveOwnerRepo(options);
    const contributors = await client.repo.getContributors(owner, repo);

    console.log(`仓库贡献者: ${contributors.length}`);
    contributors.forEach((contributor) => {
      console.log(
        `${contributor.name} <${contributor.email}> - ${contributor.contributions} 次贡献`,
      );
    });
  }, '获取仓库贡献者失败');
}

export async function repoWebhooksCommand(options: RepoOptions = {}): Promise<void> {
  await withClient(async (client) => {
    const { owner, repo } = await resolveOwnerRepo(options);
    const webhooks = await client.repo.getWebhooks(owner, repo);

    console.log(`仓库 Webhooks: ${webhooks.length}`);
    webhooks.forEach((webhook) => {
      console.log(`Webhook ${webhook.id}: ${webhook.name}`);
    });
  }, '获取仓库 Webhooks 失败');
}

export function repoSubCommand(): Command {
  const repoProgram = new Command('repo');

  repoProgram
    .command('settings')
    .description('Show repository settings')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository')
    .action(repoSettingsCommand);

  repoProgram
    .command('branches')
    .description('List repository branches')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository')
    .action(repoBranchesCommand);

  repoProgram
    .command('commits')
    .description('Show repository commits')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository')
    .action(repoCommitsCommand);

  repoProgram
    .command('contributors')
    .description('Show repository contributors')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository')
    .action(repoContributorsCommand);

  repoProgram
    .command('webhooks')
    .description('List repository webhooks')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository')
    .action(repoWebhooksCommand);

  return repoProgram;
}
