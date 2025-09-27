#!/usr/bin/env node
import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import { authCommand } from './commands/auth';
import { createLogger, setGlobalLogLevel, type LogLevel } from '@gitany/shared';
import { repoCommand } from './commands/repo';
import { prCommand } from './commands/pr';
import { userCommand } from './commands/user';
import { issueCommand } from './commands/issue';
import { resolveRepoUrl } from '@gitany/git-lib';

const program = new Command();
const logger = createLogger('@xbghc/gitcode-cli');

program
  .name('gitcode')
  .description('tools for GitCode')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable debug logging')
  .option('-q, --quiet', 'Silence all logs (silent level)')
  .option('--log-level <level>', 'Set log level (fatal|error|warn|info|debug|trace|silent)');

// Apply logging options before any command action
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.opts<{ verbose?: boolean; quiet?: boolean; logLevel?: string }>();
  let level: LogLevel | undefined;
  if (opts.quiet) level = 'silent';
  else if (opts.verbose) level = 'debug';
  else if (opts.logLevel) {
    const v = String(opts.logLevel).toLowerCase();
    const allowed = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
    if (allowed.has(v)) level = v as LogLevel;
  }
  if (level) {
    try {
      setGlobalLogLevel(level);
    } catch (error) {
      logger.debug({ error }, 'Failed to set global log level');
    }
    // Also update local logger instance
    try {
      logger.level = level;
    } catch (error) {
      logger.debug({ error }, 'Failed to set local log level');
    }
  }
});

// parse command
program
  .command('parse [url]')
  .description('Parse Git URL and output JSON')
  .action(async (url?: string) => {
    try {
      const repoUrl = await resolveRepoUrl(url);
      const parsed = parseGitUrl(repoUrl);
      if (!parsed) {
        logger.error({ url: repoUrl }, 'Unrecognized git URL');
        process.exit(1);
      }
      console.log(JSON.stringify(parsed, null, 2));
    } catch (err) {
      logger.error({ err }, 'Failed to parse git URL');
      process.exit(1);
    }
  });

// auth command
program.addCommand(authCommand());

// repo command
program.addCommand(repoCommand());

// pr command
program.addCommand(prCommand());

// user command
program.addCommand(userCommand());

// issue command
program.addCommand(issueCommand());

program.parse();
