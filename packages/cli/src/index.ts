#!/usr/bin/env node
import { parseGitUrl } from '@gitany/gitcode';
import { authCommand, printAuthHelp } from './commands/auth';
import { repoCommand, printRepoHelp } from './commands/repo';
import { pullsCommand, printPullsHelp } from './commands/pulls';
import { prCommand, printPrHelp } from './commands/pr';

function printHelp(): void {
  console.log(`gitcode - tools for GitCode\n\nUsage:\n  gitcode auth set-token <token>\n  gitcode parse <git-url>\n  gitcode repo <command> [options]\n  gitcode pr list <git-url> [options]\n\nExamples:\n  gitcode auth set-token <token>\n  gitcode parse https://github.com/owner/repo.git\n  gitcode repo permission https://gitcode.com/owner/repo.git\n  gitcode pr list https://gitcode.com/owner/repo.git --state open`);
}

async function main(): Promise<void> {
  const [, , ...args] = process.argv;
  const cmd = args.shift();
  if (!cmd || cmd === '-h' || cmd === '--help') {
    printHelp();
    return;
  }

  switch (cmd) {
    case 'auth': {
      if (!args.length) {
        printAuthHelp();
        return;
      }
      await authCommand(args);
      return;
    }
    case 'parse': {
      const input = args[0];
      if (!input) {
        console.error('Provide a git URL to parse.');
        process.exitCode = 1;
        return;
      }
      const parsed = parseGitUrl(input);
      if (!parsed) {
        console.error('Unrecognized git URL:', input);
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(parsed, null, 2));
      return;
    }
    case 'repo': {
      if (!args.length) {
        printRepoHelp();
        return;
      }
      await repoCommand(args);
      return;
    }
    case 'pulls': {
      // Back-compat alias for old command name
      if (!args.length) {
        printPullsHelp();
        return;
      }
      await pullsCommand(args);
      return;
    }
    case 'pr': {
      if (!args.length) {
        printPrHelp();
        return;
      }
      await prCommand(args);
      return;
    }
    default: {
      printHelp();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
