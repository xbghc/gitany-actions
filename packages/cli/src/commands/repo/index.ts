import { Command } from 'commander';
import { permissionCommand } from './permission';

export function repoCommand(): Command {
  const repoProgram = new Command('repo')
    .description('Repository commands');

  repoProgram
    .command('permission <url>')
    .description('Show current user\'s role on a repo')
    .action(permissionCommand);

  return repoProgram;
}

