import { GitcodeAuth } from '@gitany/gitcode';

export async function authCommand(args: string[]): Promise<void> {
  const sub = args[0];
  const auth = new GitcodeAuth();

  switch (sub) {
    case 'set-token': {
      const token = args[1];
      if (!token) {
        console.error('Usage: gitcode auth set-token <token>');
        process.exitCode = 1;
        return;
      }
      await auth.setToken(token.trim());
      console.log('Token saved successfully');
      return;
    }
    default: {
      printAuthHelp();
    }
  }
}

export function printAuthHelp() {
  console.log(`Usage: gitcode auth <command> [options]\n\nCommands:\n  set-token <token>    Save a GitCode token to config file\n\nExamples:\n  gitcode auth set-token your_personal_access_token`);
}
