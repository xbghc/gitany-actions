import { permissionCommand, printPermissionHelp } from './permission';

export async function repoCommand(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'permission': {
      const rest = args.slice(1);
      if (!rest.length) {
        printPermissionHelp();
        return;
      }
      await permissionCommand(rest);
      return;
    }
    default: {
      printRepoHelp();
    }
  }
}

export function printRepoHelp() {
  console.log(
    `Usage: gitcode repo <command> [options]\n\nCommands:\n  permission   Show current user's role on a repo\n\nExamples:\n  gitcode repo permission https://gitcode.com/owner/repo.git`
  );
}

