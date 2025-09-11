import { Command } from 'commander';
import { GitcodeClient } from '@gitany/gitcode';

export function authCommand(): Command {
  const authProgram = new Command('auth').description('Authentication commands');

  authProgram
    .command('set-token')
    .description('Set authentication token')
    .argument('<token>', 'Authentication token')
    .action(async (token) => {
      try {
        const client = new GitcodeClient();
        await client.auth.setToken(token.trim());
        console.log('Token saved successfully');
      } catch (error) {
        console.error('Failed to save token:', error);
        process.exit(1);
      }
    });

  return authProgram;
}
