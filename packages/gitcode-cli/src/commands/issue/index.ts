import { Command } from 'commander';
import { listCommand } from './list.js';
import { createCommand } from './create.js';
import { createCommentCommand } from './create-comment.js';
import { statusCommand } from './status.js';
import { viewCommand } from './view.js';
import { editCommand } from './edit.js';
import { closeCommand } from './close.js';
import { reopenCommand } from './reopen.js';
import { editCommentCommand } from './edit-comment.js';

export function issueCommand(): Command {
  const issueProgram = new Command('issue').description('Manage GitCode issues');

  issueProgram
    .command('list')
    .alias('ls')
    .description('List issues for a repository')
    .argument('[url]', 'Repository URL')
    .option('-s, --state <state>', 'Filter by state: open | closed | all', 'open')
    .option('--label <labels>', 'Comma-separated labels')
    .option('--page <n>', 'Page number')
    .option('--per-page <n>', 'Items per page')
    .option('-L, --limit <n>', 'Maximum number of issues to return')
    .option('--json', 'Output raw JSON instead of list')
    .action(listCommand);

  // Create issue command with GitHub CLI style options
  issueProgram.addCommand(createCommand());

  // View/edit operations
  issueProgram.addCommand(viewCommand());
  issueProgram.addCommand(editCommand());
  issueProgram.addCommand(closeCommand());
  issueProgram.addCommand(reopenCommand());

  // Comment command with simplified syntax
  issueProgram.addCommand(createCommentCommand());
  issueProgram.addCommand(editCommentCommand());

  // Status command for issue statistics
  issueProgram.addCommand(statusCommand());

  return issueProgram;
}
