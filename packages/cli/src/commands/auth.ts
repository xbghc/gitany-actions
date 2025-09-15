import { Command } from 'commander';
import { withClient } from '../utils/with-client';

export function authCommand(): Command {
  const authProgram = new Command('auth').description('Authentication commands');

  authProgram
    .command('set-token')
    .description('Set authentication token')
    .argument('<token>', 'Authentication token')
    .action(async (token) => {
      await withClient(
        async (client) => {
          await client.auth.setToken(token.trim());
          console.log('Token saved successfully');
        },
        'Failed to save token',
      );
    });

  return authProgram;
}
