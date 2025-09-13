import { Command } from 'commander';
import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@gitany/cli');

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
        logger.error({ error }, 'Failed to save token');
        process.exit(1);
      }
    });

  return authProgram;
}
