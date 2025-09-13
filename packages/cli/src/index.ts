#!/usr/bin/env node
import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import { authCommand } from './commands/auth';
import { createLogger } from '@gitany/shared';
import { repoCommand } from './commands/repo';
import { prCommand } from './commands/pr';
import { userCommand } from './commands/user';
import { issueCommand } from './commands/issue';
import { resolveRepoUrl } from '@gitany/git-lib';

const program = new Command();
const logger = createLogger('@gitany/cli');

program
  .name('gitcode')
  .description('tools for GitCode')
  .version('0.1.0');

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
