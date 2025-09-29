import { Command } from 'commander';
import { withClient } from '../../utils/with-client';
import { createLogger } from '@gitany/shared';

const logger = createLogger('gitcode-cli:pr');

export async function prSettingsCommand(owner: string, repo: string): Promise<void> {
  await withClient(async (client) => {
    const settings = await client.pr.getSettings(owner, repo);

    logger.info({
      allow_merge_commits: settings.allow_merge_commits,
      allow_squash_commits: settings.allow_squash_commits,
      allow_rebase_commits: settings.allow_rebase_commits,
      allow_updates_from_default_branch: settings.allow_updates_from_default_branch,
      allow_worktree_inheritance: settings.allow_worktree_inheritance,
      allow_auto_close_on_conflict: settings.allow_auto_close_on_conflict
    }, 'PR 设置');
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
