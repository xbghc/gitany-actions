import { Command } from 'commander';
import { parseGitUrl } from '@xbghc/gitcode-api';
import { withClient } from '../../utils/with-client.js';
import { resolveGitCodeRepoUrl } from '../../utils/resolve-repo-url.js';

interface SettingsOptions {
  repo?: string;
}

export async function prSettingsCommand(options: SettingsOptions = {}): Promise<void> {
  await withClient(async (client) => {
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

    const settings = await client.repo.getPullRequestSettings(owner, repo);
    console.log('PR 设置');
    console.log(`  reject_not_signed_by_gpg: ${settings.reject_not_signed_by_gpg}`);
    console.log(`  deny_force_push: ${settings.deny_force_push}`);
    console.log(`  max_file_size: ${settings.max_file_size}`);
    console.log(`  skip_rule_for_owner: ${settings.skip_rule_for_owner}`);
  }, '获取 PR 设置失败');
}

export function prSubCommand(): Command {
  const prProgram = new Command('pr');

  prProgram
    .command('settings')
    .description('Show pull request settings')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository')
    .action(prSettingsCommand);

  return prProgram;
}
