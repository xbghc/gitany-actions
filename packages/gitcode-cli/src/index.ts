#!/usr/bin/env node
import { resolveRepoUrl } from '@xbghc/git-lib';
import { parseGitUrl } from '@xbghc/gitcode-api';
import { Command } from 'commander';
import { authCommand } from './commands/auth.js';
import { issueCommand } from './commands/issue/index.js';
import { prCommand } from './commands/pr/index.js';
import { repoCommand } from './commands/repo/index.js';
import { userCommand } from './commands/user/index.js';

const program = new Command();

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
        console.error('Unrecognized git URL:', repoUrl);
        process.exit(1);
      }
      console.log(JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.error('Failed to parse git URL:', err);
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
