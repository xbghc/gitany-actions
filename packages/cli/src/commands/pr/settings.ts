import { Command } from 'commander';
import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@gitany/cli');

export async function prSettingsCommand(owner: string, repo: string): Promise<void> {
  try {
    const client = new GitcodeClient();
    const settings = await client.pr.getSettings(owner, repo);

    console.log('PR 设置:');
    console.log(`  允许合并提交: ${settings.allow_merge_commits ? '是' : '否'}`);
    console.log(`  允许压缩提交: ${settings.allow_squash_commits ? '是' : '否'}`);
    console.log(`  允许变基提交: ${settings.allow_rebase_commits ? '是' : '否'}`);
    console.log(`  允许从默认分支更新: ${settings.allow_updates_from_default_branch ? '是' : '否'}`);
    console.log(`  允许工作树继承: ${settings.allow_worktree_inheritance ? '是' : '否'}`);
    console.log(`  冲突时自动关闭: ${settings.allow_auto_close_on_conflict ? '是' : '否'}`);
  } catch (error) {
    logger.error({ error }, '获取 PR 设置失败');
    process.exit(1);
  }
}

export function prSubCommand(): Command {
  const prProgram = new Command('pr');

  prProgram
    .command('settings <owner> <repo>')
    .description('Show pull request settings')
    .action(prSettingsCommand);

  return prProgram;
}