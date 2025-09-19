import { Command } from 'commander';
import { createCommand as createPrCommand } from './create';
import { prCommentsCommand } from './comments';
import { settingsCommand } from './settings';
import { listCommand } from './list';
import { createCommentCommand } from './create-comment';

function prSubCommand(): Command {
  const prProgram = new Command('pr');

  prProgram
    .command('create [url]')
    .description('Create a pull request')
    .option('--title <string>', 'Title of the PR')
    .option('--head <string>', 'Head branch')
    .option('--base <string>', 'Base branch')
    .option('--body <string>', 'Body of the PR')
    .option('--issue <number>', 'Associated issue number')
    .option('--json', 'Output raw JSON')
    .action(createPrCommand);

  prProgram
    .command('comments <pr-number> [url]')
    .description('List comments on a pull request')
    .option('--page <number>', 'Page number')
    .option('--per-page <number>', 'Items per page')
    .option('--comment-type <type>', 'Type of comment: diff_comment, pr_comment')
    .option('--json', 'Output raw JSON')
    .action(prCommentsCommand);

  prProgram
    .command('settings <url>')
    .description('Show PR settings for a repository')
    .action(settingsCommand);

  prProgram
    .command('list [url]')
    .description('List pull requests')
    .option('--state <state>', 'State of the PR (open, closed, merged, all)')
    .option('--head <branch>', 'Filter by head branch')
    .option('--base <branch>', 'Filter by base branch')
    .option('--sort <sort>', 'Sort by: created, updated, popularity, long-running')
    .option('--direction <direction>', 'Sort direction: asc, desc')
    .option('--json', 'Output raw JSON')
    .action(listCommand);

  const allCommands = [prProgram, createCommentCommand()];
  allCommands.forEach((cmd) => prProgram.addCommand(cmd));

  return prProgram;
}

export { prSubCommand };
