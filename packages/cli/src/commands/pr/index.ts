import { Command } from 'commander';
import { listCommand } from './list';
import { createCommand } from './create';
import { prSubCommand } from './settings';
import { createPrCommentCommand } from './create-comment';
import { prCommentsCommand } from './comments';

export function prCommand(): Command {
  const prProgram = new Command('pr')
    .description('Pull request commands');

    prProgram
      .command('list')
      .description('List pull requests for a repository')
      .argument('[url]', 'Repository URL')
      .option('--state <state>', 'Filter by state: open | closed | all', 'open')
    .option('--head <ref>', 'Filter by head (branch or repo:branch)')
    .option('--base <branch>', 'Filter by base branch')
    .option('--sort <field>', 'Optional sort field if supported')
    .option('--direction <dir>', 'asc | desc')
    .option('--json', 'Output raw JSON instead of list')
    .action(listCommand);

    prProgram
      .command('create')
      .description('Create a new pull request')
      .argument('[url]', 'Repository URL')
    .requiredOption('--title <title>', 'Title of the PR')
    .requiredOption('--head <branch>', 'Source branch name')
    .option('--base <branch>', 'Target branch')
    .option('--body <text>', 'Description/body text')
    .option('--issue <n>', 'Associate an issue number with the PR')
    .option('--json', 'Output created PR as JSON')
    .action(createCommand);

  // Comment command
  prProgram.addCommand(createPrCommentCommand());

  // Comments list command
  prProgram
    .command('comments')
    .description('List comments on a pull request')
    .argument('<pr-number>', 'Pull request number')
    .argument('[url]', 'Repository URL')
    .option('--page <number>', 'Page number')
    .option('--perPage <number>', 'Items per page')
    .option('--commentType <type>', 'Comment type: diff_comment | pr_comment')
    .option('--json', 'Output raw JSON')
    .action(prCommentsCommand);

  // 添加子命令组
  const infoGroup = prProgram
    .command('info')
    .description('Pull request information commands');

  const subCommands = prSubCommand().commands;
  subCommands.forEach(cmd => {
    infoGroup.addCommand(cmd);
  });

  return prProgram;
}