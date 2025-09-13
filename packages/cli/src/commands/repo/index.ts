import { Command } from 'commander';
import { permissionCommand } from './permission';
import { repoSubCommand } from './info';

export function repoCommand(): Command {
  const repoProgram = new Command('repo')
    .description('Repository commands');

  repoProgram
    .command('permission [url]')
    .description('Show current user\'s role on a repo')
    .action(permissionCommand);

  // 添加子命令组
  const infoGroup = repoProgram
    .command('info')
    .description('Repository information commands');

  const subCommands = repoSubCommand().commands;
  subCommands.forEach(cmd => {
    infoGroup.addCommand(cmd);
  });

  return repoProgram;
}

