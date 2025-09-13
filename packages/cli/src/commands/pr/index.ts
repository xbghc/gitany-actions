import { Command } from 'commander';
import { listCommand } from './list';
import { createCommand } from './create';

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

  return prProgram;
}