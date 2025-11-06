import { Command } from 'commander';
import { withClient } from '../../utils/with-client.js';

export async function prSettingsCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
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
    .command('settings <owner> <repo>')
    .description('Show pull request settings')
    .action(prSettingsCommand);

  return prProgram;
}
