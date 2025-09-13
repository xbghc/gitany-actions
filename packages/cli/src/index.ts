#!/usr/bin/env node
import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import { authCommand } from './commands/auth';
import { repoCommand } from './commands/repo';
import { prCommand } from './commands/pr';
import { userCommand } from './commands/user';
import { issueCommand } from './commands/issue';

const program = new Command();

program
  .name('gitcode')
  .description('tools for GitCode')
  .version('0.1.0');

// parse command
program
  .command('parse <url>')
  .description('Parse Git URL and output JSON')
  .action((url) => {
    const parsed = parseGitUrl(url);
    if (!parsed) {
      console.error('Unrecognized git URL:', url);
      process.exit(1);
    }
    console.log(JSON.stringify(parsed, null, 2));
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
