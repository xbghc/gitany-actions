import { Command } from 'commander';
import { listCommand } from './list';
import { commentsCommand } from './comments';

export function issueCommand(): Command {
  const issueProgram = new Command('issue')
    .description('Issue commands');

  issueProgram
    .command('list')
    .description('List issues for a repository')
    .argument('<url>', 'Repository URL')
    .option('--state <state>', 'Filter by state: open | closed | all', 'open')
    .option('--labels <labels>', 'Comma-separated labels')
    .option('--page <n>', 'Page number')
    .option('--per-page <n>', 'Items per page')
    .option('--json', 'Output raw JSON instead of list')
    .action(listCommand);

  issueProgram
    .command('comments')
    .description('List comments for an issue')
    .argument('<url>', 'Repository URL')
    .argument('<number>', 'Issue number')
    .option('--page <n>', 'Page number')
    .option('--per-page <n>', 'Items per page')
    .option('--json', 'Output raw JSON instead of list')
    .action(commentsCommand);

  return issueProgram;
}
