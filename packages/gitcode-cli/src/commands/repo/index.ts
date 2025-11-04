import { Command } from 'commander';
import { permissionCommand } from './permission.js';
import { repoSubCommand } from './info.js';
import { notificationsCommand } from './notifications.js';
import { markNotificationsReadCommand } from './mark-read.js';

export function repoCommand(): Command {
  const repoProgram = new Command('repo').description('Repository commands');

  repoProgram
    .command('permission [url]')
    .description("Show current user's role on a repo")
    .option('--json', 'Output raw JSON instead of formatted text')
    .action(permissionCommand);

  repoProgram
    .command('notifications [url]')
    .description('Get repository notifications')
    .option('--json', 'Output raw JSON instead of formatted text')
    .option('--read', 'Show read notifications (default is unread only)')
    .option('--type <type>', 'Filter by type: all, event, or referer')
    .option('--since <datetime>', 'Show notifications updated after this time (ISO 8601)')
    .option('--before <datetime>', 'Show notifications updated before this time (ISO 8601)')
    .action(notificationsCommand);

  repoProgram
    .command('mark-read [url] <ids...>')
    .description('Mark notifications as read by IDs')
    .option('--json', 'Output raw JSON instead of formatted text')
    .action(markNotificationsReadCommand);

  // 添加子命令组
  const infoGroup = repoProgram.command('info').description('Repository information commands');

  const subCommands = repoSubCommand().commands;
  subCommands.forEach((cmd) => {
    infoGroup.addCommand(cmd);
  });

  return repoProgram;
}
