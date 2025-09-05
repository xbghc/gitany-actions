#!/usr/bin/env node
import { parseGitUrl } from '@gitany/gitcode';
import { authCommand, printAuthHelp } from './commands/auth';
import { permissionCommand, printPermissionHelp } from './commands/permission';

function printHelp(): void {
  console.log(`gitcode - tools for GitCode\n\nUsage:\n  gitcode auth <login|status|logout> [options]\n  gitcode parse <git-url>\n  gitcode permission <git-url> [options]\n\nExamples:\n  gitcode auth login --token <token>\n  gitcode auth status\n  gitcode parse https://github.com/owner/repo.git\n  gitcode permission https://gitcode.com/owner/repo.git`);
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
    case 'permission': {
      if (!args.length) {
        printPermissionHelp();
        return;
      }
      await permissionCommand(args);
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
