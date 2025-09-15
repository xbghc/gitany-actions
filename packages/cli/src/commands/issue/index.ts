import { Command } from 'commander';
import { listCommand } from './list';
import { commentsCommand } from './comments';
import { createCommand, createAction } from './create';
import type { CreateOptions } from './create';
import { createCommentCommand } from './create-comment';
import { statusCommand } from './status';

export function issueCommand(): Command {
  const issueProgram = new Command('issue')
    .description('Manage GitCode issues');

  issueProgram
    .command('list')
    .alias('ls')
    .description('List issues for a repository')
    .argument('[url]', 'Repository URL')
    .option('-s, --state <state>', 'Filter by state: open | closed | all', 'open')
    .option('--labels <labels>', 'Comma-separated labels')
    .option('--page <n>', 'Page number')
    .option('--per-page <n>', 'Items per page')
    .option('-L, --limit <n>', 'Maximum number of issues to return')
    .option('--json', 'Output raw JSON instead of list')
    .action(listCommand);

  issueProgram
    .command('comments')
    .description('List comments for an issue')
    .argument('<number>', 'Issue number')
    .argument('[url]', 'Repository URL')
    .option('--page <n>', 'Page number')
    .option('--per-page <n>', 'Items per page')
    .option('--json', 'Output raw JSON instead of list')
    .action((number, url, options) => commentsCommand(number, url, options));

  // Create issue command with GitHub CLI style options
  issueProgram.addCommand(createCommand());
  
  // Add alias for create
  issueProgram
    .command('new')
    .description('Create a new issue (alias for create)')
    .action(async (ownerArg?: string, repoArg?: string, titleArg?: string, options?: CreateOptions) => {
      await createAction(ownerArg || '', repoArg || '', titleArg, options);
    });

  // Comment command with simplified syntax
  issueProgram.addCommand(createCommentCommand());
  
  // Status command for issue statistics
  issueProgram.addCommand(statusCommand());

  return issueProgram;
}
