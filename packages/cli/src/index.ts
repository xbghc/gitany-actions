#!/usr/bin/env node

import { Command } from 'commander';
import { authCommand } from './commands/auth';
import { createLogger, setGlobalLogLevel, type LogLevel } from '@gitany/shared';
import { prSubCommand } from './commands/pr';
import { userCommand } from './commands/user';
import { issueCommand } from './commands/issue';
import { repoCommand } from './commands/repo';

const program = new Command();

program.version('0.1.0').description('A CLI for GitCode');

program.addCommand(authCommand());
program.addCommand(prSubCommand());
program.addCommand(issueCommand());
program.addCommand(userCommand());
program.addCommand(repoCommand());

program
  .option('-l, --log-level <level>', 'Set log level', 'info')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    setGlobalLogLevel(options.logLevel as LogLevel);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

const logger = createLogger('@gitany/cli');

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack || err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});
